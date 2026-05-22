// Copyright (C) 2016 - present Juergen Zimmermann, Hochschule Karlsruhe
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

/**
 * Das Modul besteht aus der Klasse {@linkcode AppProfileWriteService} für die
 * Schreiboperationen im Anwendungskern.
 * @packageDocumentation
 */

import { prismaClient } from '../../config/prisma-client.mts';
import {
    type Prisma,
    type ProfileAvatar,
} from '../../generated/prisma/client.ts';
import { getLogger } from '../../logger/logger.mts';
import { sendmail } from '../../mail/sendmail.mts';
import { AppProfileService } from './app-profile-service.mts';
import {
    NotFoundError,
    VersionInvalidError,
    VersionOutdatedError,
} from './errors.mts';

export type AppProfileCreate = Prisma.AppProfileCreateInput;
type AppProfileCreated = Prisma.AppProfileGetPayload<{
    include: {
        trackingConfig: true;
        screentimeLogs: true;
    };
}>;

export type AppProfileUpdate = Prisma.AppProfileUpdateInput;
/** Typdefinitionen zum Aktualisieren eines Buches mit `update`. */
export type UpdateParams = {
    /** ID des zu aktualisierenden Buches. */
    readonly id: string | undefined;
    /** Buch-Objekt mit den aktualisierten Werten. */
    readonly appProfile: AppProfileUpdate;
    /** Versionsnummer für die zu aktualisierenden Werte. */
    readonly version: string;
};
type AppProfileUpdated = Prisma.AppProfileGetPayload<{}>;

type ProfileAvatarCreate = Prisma.ProfileAvatarUncheckedCreateInput;
export type ProfileAvatarCreated = Prisma.ProfileAvatarGetPayload<{}>;

/**
 * Die Klasse `BuchWriteService` implementiert den Anwendungskern für das
 * Schreiben von Bücher und greift mit _Prisma_ auf die DB zu.
 */
export class AppProfileWriteService {
    private static readonly VERSION_PATTERN = /^"\d{1,3}"/u;

    readonly #readService: AppProfileService;

    readonly #logger = getLogger(AppProfileWriteService.name);

    // eslint-disable-next-line max-params
    constructor(readService: AppProfileService) {
        this.#readService = readService;
    }

    /**
     * Ein neues App-Profil wird asynchron angelegt.
     *
     * @param appProfile zu erstellendes App-Profil
     * @returns ID des neu angelegten App-Profils
     */
    async create(appProfile: AppProfileCreate) {
        this.#logger.debug('create: buch=%o', appProfile);

        let appProfileDb: AppProfileCreated | undefined;
        await prismaClient.$transaction(async (tx) => {
            appProfileDb = await tx.appProfile.create({
                data: appProfile,
                include: { trackingConfig: true, screentimeLogs: true },
            });
        });
        await this.#sendmail({
            id: appProfileDb?.id ?? 'N/A',
            titel: appProfileDb?.displayName ?? 'N/A',
        });

        this.#logger.debug('create: appProfileDb.id=%s', appProfileDb?.id);
        return appProfileDb?.id;
    }

    /**
     * Upload Avatar for an existing App Profile. If an avatar already exists for the profile, it will be deleted and replaced.
     * @param appProfileId ID of the App Profile for which the avatar should be uploaded
     * @param data Buffer with the avatar file data
     * @param name Filename of the avatar
     * @param size Size of the avatar file in bytes
     * @param type MIME type of the avatar file
     * @returns The created ProfileAvatar or undefined if the App Profile does not exist
     */
    async uploadAvatar(
        appProfileId: string,
        data: Buffer,
        name: string,
        size: number,
        type: string,
    ): Promise<Readonly<ProfileAvatar> | undefined> {
        this.#logger.debug(
            'uploadAvatar: appProfileId=%s, filename=%s, size=%d',
            appProfileId,
            name,
            size,
        );

        // TODO Dateigroesse pruefen

        let profileAvatarCreated: ProfileAvatarCreated | undefined;
        await prismaClient.$transaction(async (tx) => {
            const appProfile = await tx.appProfile.findUnique({
                where: { id: appProfileId },
            });
            if (appProfile === null) {
                this.#logger.debug(
                    'Es gibt kein App-Profil mit der ID %s',
                    appProfileId,
                );
                throw new NotFoundError(
                    `Es gibt kein App-Profil mit der ID ${appProfileId}.`,
                );
            }

            // delete existing avatar for the profile, if any
            await tx.profileAvatar.deleteMany({
                where: { profileId: appProfileId },
            });

            const profileAvatar: ProfileAvatarCreate = {
                filename: name,
                fileData: data as Uint8Array<ArrayBuffer>,
                mimetype: type,
                fileSizeBytes: data?.byteLength,
                profileId: appProfileId,
            };
            profileAvatarCreated = await tx.profileAvatar.create({
                data: profileAvatar,
            });
        });

        this.#logger.debug(
            'addFile: id=%s, byteLength=%s, filename=%s, mimetype=%s',
            profileAvatarCreated?.id,
            profileAvatarCreated?.fileData.byteLength,
            profileAvatarCreated?.filename,
            profileAvatarCreated?.mimetype,
        );
        return profileAvatarCreated;
    }

    /**
     * Update an existing App Profile. The version number is checked to prevent lost updates. If the version number is outdated, a VersionOutdatedError is thrown. If the version number is invalid, a VersionInvalidError is thrown. If the App Profile with the given ID does not exist, a NotFoundError is thrown.
     * @param param0 Object with the following properties:
     * - id: ID of the App Profile to be updated
     * - appProfile: AppProfileUpdate object with the updated values
     * - version: version number for optimistic locking, must be in the format '"<number>"', e.g. '"0"'
     * @returns The new version number of the updated App Profile
     */
    // https://2ality.com/2015/01/es6-destructuring.html#simulating-named-parameters-in-javascript
    async update({ id, appProfile, version }: UpdateParams) {
        this.#logger.debug(
            'update: id=%s, appProfile=%o, version=%s',
            id,
            appProfile,
            version,
        );
        if (id === undefined) {
            this.#logger.debug('update: Keine gueltige ID');
            throw new NotFoundError(
                `Es gibt kein App-Profil mit der ID ${id}.`,
            );
        }

        // prohibit lost updates by checking the version before updating the book
        await this.#validateUpdate(id, version);

        appProfile.version = { increment: 1 };
        let appProfileUpdated: AppProfileUpdated | undefined;
        await prismaClient.$transaction(async (tx) => {
            appProfileUpdated = await tx.appProfile.update({
                data: appProfile,
                where: { id },
            });
        });
        this.#logger.debug(
            'update: appProfileUpdated=%s',
            JSON.stringify(appProfileUpdated),
        );

        return appProfileUpdated?.version ?? Number.NaN;
    }

    /**
     * Ein App-Profil wird asynchron anhand seiner ID gelöscht.
     *
     * @param id ID des zu löschenden App-Profils
     * @returns true, falls das App-Profil vorhanden war und gelöscht wurde. Sonst false.
     */
    async delete(id: string) {
        this.#logger.debug('delete: id=%s', id);

        const appProfile = await prismaClient.appProfile.findUnique({
            where: { id },
        });
        if (appProfile === null) {
            this.#logger.debug('delete: not found');
            return false;
        }

        await prismaClient.$transaction(async (tx) => {
            await tx.appProfile.delete({ where: { id } });
        });

        this.#logger.debug('delete');
        return true;
    }

    async #sendmail({ id, titel }: { id: string | 'N/A'; titel: string }) {
        const subject = `Neues App-Profil ${id}`;
        const body = `Das App-Profil mit dem Titel <strong>${titel}</strong> ist angelegt`;
        await sendmail({ subject, body });
    }

    async #validateUpdate(id: string, versionStr: string) {
        this.#logger.debug(
            '#validateUpdate: id=%s, versionStr=%s',
            id,
            versionStr,
        );
        if (!AppProfileWriteService.VERSION_PATTERN.test(versionStr)) {
            throw new VersionInvalidError(versionStr);
        }

        const version = Number.parseInt(versionStr.slice(1, -1), 10);
        const appProfileDb = await this.#readService.findById({ id });

        if (version < appProfileDb.version) {
            this.#logger.debug('#validateUpdate: versionDb=%d', version);
            throw new VersionOutdatedError(version);
        }
    }
}

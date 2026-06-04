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
 * Das Modul besteht aus der Klasse {@linkcode AppProfileService}.
 * @packageDocumentation
 */

import { prismaClient } from '../../config/prisma-client.mts';
import { Prisma, ProfileAvatar } from '../../generated/prisma/client.ts';
import { AppProfileInclude } from '../../generated/prisma/models.ts';
import { getLogger } from '../../logger/logger.mts';
import { NotFoundError } from './errors.mts';
import { type Pageable } from './pageable.mts';
import { type QueryParams, QueryParamKeys } from './queryparams.mts';
import { type Slice } from './slice.mts';
import { buildWhere } from './where-builder.mts';

export type AppProfileWithTrackingConfig = Prisma.AppProfileGetPayload<{
    include: { trackingConfig: true };
}>;

export type AppProfileWithTrackingConfigAndScreentimeLogs =
    Prisma.AppProfileGetPayload<{
        include: {
            trackingConfig: true;
            screentimeLogs: true;
        };
    }>;

/**
 * Class `AppProfileService` implements the application core for reading AppProfiles and accesses the DB with _Prisma_.
 */
export class AppProfileService {
    static readonly ID_PATTERN = /^[1-9]\d{0,10}$/u;

    readonly #includeTrackingConfig: AppProfileInclude = {
        trackingConfig: true,
    };
    readonly #includeTrackingConfigAndScreentimeLogs: AppProfileInclude = {
        trackingConfig: true,
        screentimeLogs: true,
    };

    readonly #logger = getLogger(AppProfileService.name);

    /**
     * Search AppProfile asynchron by ID.
     * @param id ID of searching AppProfiles
     * @returns Found AppProfile (Promise).
     * @throws NotFoundError if there is no AppProfile with the ID.
     */
    async findById({
        id,
        withScreentimeLogs: withScreentimeLogs,
    }: {
        readonly id: string;
        readonly withScreentimeLogs?: boolean;
    }): Promise<Readonly<AppProfileWithTrackingConfigAndScreentimeLogs>> {
        this.#logger.debug('findById: id=%s', id);

        const include = withScreentimeLogs
            ? this.#includeTrackingConfigAndScreentimeLogs
            : this.#includeTrackingConfig;
        const appProfile: AppProfileWithTrackingConfigAndScreentimeLogs | null =
            await prismaClient.appProfile.findUnique({
                where: { id },
                include,
            });
        if (appProfile === null) {
            this.#logger.debug('Es gibt kein AppProfile mit der ID %s', id);
            throw new NotFoundError(
                `Es gibt kein AppProfile mit der ID ${id}.`,
            );
        }

        this.#logger.debug('findById: appProfile=%o', appProfile);
        return appProfile;
    }

    /**
     * Avatar suchen zu einem Profil.
     * @param appProfileId ID des zugehörigen App Profils.
     * @returns Binärdatei oder undefined als Promise.
     */
    async findAvatarByAppProfileId(
        appProfileId: string,
    ): Promise<Readonly<ProfileAvatar> | undefined> {
        this.#logger.debug('findFileByBuchId: buchId=%s', appProfileId);
        const profileAvatar: ProfileAvatar | null =
            await prismaClient.profileAvatar.findUnique({
                where: { profileId: appProfileId },
            });
        if (profileAvatar === null) {
            this.#logger.debug(
                'findAvatarByAppProfileId: Keine Datei gefunden',
            );
            return;
        }

        this.#logger.debug(
            'findAvatarByAppProfileId: id=%s, byteLength=%d, filename=%s, mimetype=%s, profileId=%s',
            profileAvatar.id,
            profileAvatar.fileData.byteLength,
            profileAvatar.filename,
            profileAvatar.mimetype,
            profileAvatar.profileId,
        );

        // als Datei im Wurzelverzeichnis des Projekts speichern:
        // import { writeFile } from 'node:fs/promises';
        // await writeFile(buchFile.filename, buchFile.data);

        return profileAvatar;
    }

    /**
     * AppProfiles asynchron suchen.
     * @param queryparams JSON-Objekt mit Suchparameter.
     * @param pageable Maximale Anzahl an Datensätzen und Seitennummer.
     * @returns Ein JSON-Array mit den gefundenen Büchern.
     * @throws NotFoundError falls keine Bücher gefunden wurden.
     */
    async find(
        queryparams: QueryParams | undefined,
        pageable: Pageable,
    ): Promise<Readonly<Slice<Readonly<AppProfileWithTrackingConfig>>>> {
        this.#logger.debug(
            'find: suchparameter=%s, pageable=%o',
            JSON.stringify(queryparams),
            pageable,
        );

        // No query params
        if (queryparams === undefined) {
            return await this.#findAll(pageable);
        }
        const keys = Object.keys(queryparams);
        if (keys.length === 0) {
            return await this.#findAll(pageable);
        }

        // Check parameters, no types at runtime!!
        if (!this.#checkKeys(keys)) {
            this.#logger.debug('Invalid query params');
            throw new NotFoundError('Ungueltige Suchparameter');
        }

        // No transaction when reading
        const where = buildWhere(queryparams);
        const { number, size } = pageable;
        const appProfiles: AppProfileWithTrackingConfig[] =
            await prismaClient.appProfile.findMany({
                where,
                skip: number * size,
                take: size,
                include: this.#includeTrackingConfig,
            });
        if (appProfiles.length === 0) {
            this.#logger.debug('find: No AppProfiles found');
            throw new NotFoundError(
                `No AppProfiles found: ${JSON.stringify(queryparams)}, Page ${pageable.number}}`,
            );
        }
        const totalElements = await this.count(where);
        return this.#createSlice(appProfiles, totalElements);
    }

    /**
     * Count all AppProfiles.
     * @param WHERE-Phrase of origin request
     * @returns Total elements of all AppProfiles.
     */
    async count(where?: Prisma.AppProfileWhereInput) {
        this.#logger.debug('count: where=%o', where ?? 'undefined');
        const { count } = prismaClient.appProfile;
        const totalElements =
            where === undefined ? await count() : await count({ where });
        this.#logger.debug('count: %d', totalElements);
        return totalElements;
    }

    // Check keys of query params against the allowed keys from queryparams.mts
    #checkKeys(keys: readonly string[]): boolean {
        if (!keys || keys.length === 0) return true;
        // Every provided key must be contained in the whitelist
        return keys.every((k) =>
            QueryParamKeys.includes(k as keyof QueryParams),
        );
    }

    async #findAll(
        pageable: Pageable,
    ): Promise<Readonly<Slice<AppProfileWithTrackingConfig>>> {
        const { number, size } = pageable;
        const appProfiles: AppProfileWithTrackingConfig[] =
            await prismaClient.appProfile.findMany({
                skip: number * size,
                take: size,
                include: this.#includeTrackingConfig, //don't load screentimeLogs => n+1 select problem
            });
        if (appProfiles.length === 0) {
            this.#logger.debug('#findAll: Keine AppProfiles gefunden');
            let msg = `Invalid page "${number}"`;
            if (number === 0) msg = 'Keine AppProfiles gefunden';
            throw new NotFoundError(msg);
        }
        const totalElements = await this.count();
        return this.#createSlice(appProfiles, totalElements);
    }

    #createSlice(
        content: AppProfileWithTrackingConfig[],
        totalElements: number,
    ): Readonly<Slice<AppProfileWithTrackingConfig>> {
        const appProfileSlice: Slice<AppProfileWithTrackingConfig> = {
            content,
            totalElements,
        };
        this.#logger.debug('createSlice: slice=%o', appProfileSlice);
        return appProfileSlice;
    }
}

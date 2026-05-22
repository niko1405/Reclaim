// Copyright (C) 2026 - present Juergen Zimmermann, Hochschule Karlsruhe
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
 * Das Modul besteht aus Router für die Verwaltung von Bücher.
 * @packageDocumentation
 */

import { Hono } from 'hono';
import { File } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { container } from '../../container.mts';
import { getLogger } from '../../logger/logger.mts';
import {
    badRequest,
    createProblemDetails,
    preconditionRequired,
} from '../../problem-details.mts';
import { rolesRequired } from '../../security/roles-required.mts';
import {
    type AppProfileCreate,
    type AppProfileUpdate,
    type ProfileAvatarCreated,
} from '../service/app-profile-write-service.mts';
import {
    AppProfilePostSchema,
    AppProfilePostType,
    AppProfileUpdateSchema,
    AppProfileUpdateType,
} from './app-profile-validation.mts';
import { createBaseUrl } from './create-base-url.mts';

const { appProfileWriteService } = container;

/**
 * Router für die Verwaltung von App-Profilen.
 */
export const router = new Hono();

const logger = getLogger('app-profile-write-router', 'file');

router.post('/', rolesRequired('admin', 'user'), async (c) => {
    const requestBody = await c.req.json();

    const appProfileDTO: AppProfilePostType =
        AppProfilePostSchema.parse(requestBody);
    logger.debug('post: appProfileDTO=%o', appProfileDTO);

    const appProfile = toAppProfileCreateInput(appProfileDTO);
    const id = await appProfileWriteService.create(appProfile);

    const location = `${createBaseUrl(c.req)}/${id}`;
    const { header, body } = c;
    header('Location', location);
    return body(null, 201);
});

const toAppProfileCreateInput = (
    appProfileDTO: AppProfilePostType,
): AppProfileCreate => {
    const appProfile: AppProfileCreate = {
        id: randomUUID(),
        displayName: appProfileDTO.displayName,
        avatarUrl: appProfileDTO.avatarUrl ?? null,
        statusMessage: appProfileDTO.statusMessage ?? null,
        timezone: appProfileDTO.timezone,
        currentStreak: appProfileDTO.currentStreak,
        onboardingCompleted: appProfileDTO.onboardingCompleted,
        version: 0,
        ...(appProfileDTO.trackingConfig === undefined
            ? {}
            : {
                  trackingConfig: {
                      create: {
                          dailyLimitMinutes:
                              appProfileDTO.trackingConfig.dailyLimitMinutes,
                          isPublic: appProfileDTO.trackingConfig.isPublic,
                          notificationsEnabled:
                              appProfileDTO.trackingConfig.notificationsEnabled,
                      },
                  },
              }),
        ...(appProfileDTO.screentimeLogs === undefined
            ? {}
            : {
                  screentimeLogs: {
                      create: appProfileDTO.screentimeLogs.map(
                          (screentimeLogDTO) => ({
                              logDate: screentimeLogDTO.logDate,
                              totalMinutes: screentimeLogDTO.totalMinutes,
                              topApp: screentimeLogDTO.topApp ?? null,
                          }),
                      ),
                  },
              }),
    };
    return appProfile;
};

router.put('/:id', rolesRequired('admin', 'user'), async (c) => {
    const { req } = c;
    const id = req.param('id') ?? '-1';

    const version = req.header('If-Match');
    if (version === undefined) {
        logger.debug('put: version === undefined');
        return createProblemDetails(
            c,
            preconditionRequired,
            'Header "If-Match" fehlt',
        );
    }

    const requestBody = await c.req.json();

    // Validierung mit Zod
    const appProfileDTO: AppProfileUpdateType =
        AppProfileUpdateSchema.parse(requestBody);
    logger.debug('put: appProfileDTO=%o', appProfileDTO);

    const appProfile = toToAppProfileUpdate(appProfileDTO);
    const newVersion = await appProfileWriteService.update({
        id,
        appProfile,
        version,
    });
    logger.debug('put: newVersion=%d', newVersion);
    const headers = {
        ETag: `"${newVersion}"`,
    };
    return c.body(null, 204, headers);
});

const toToAppProfileUpdate = (
    appProfileDTO: AppProfileUpdateType,
): AppProfileUpdate => {
    return {
        version: 0,
        displayName: appProfileDTO.displayName,
        avatarUrl: appProfileDTO.avatarUrl ?? null,
        statusMessage: appProfileDTO.statusMessage ?? null,
        timezone: appProfileDTO.timezone,
        currentStreak: appProfileDTO.currentStreak,
        onboardingCompleted: appProfileDTO.onboardingCompleted,
    };
};

router.delete('/:id', rolesRequired('admin'), async (c) => {
    const id = c.req.param('id') ?? '-1';
    logger.debug('delete: id=%s', id);

    await appProfileWriteService.delete(id);
    return c.body(null, 204);
});

router.post('/:id', rolesRequired('admin', 'user'), async (c) => {
    const id = c.req.param('id') ?? '-1';
    logger.debug('upload: id=%s', id);

    const contentType = c.req.header('Content-Type');
    logger.debug('upload: contentType=%s', contentType);

    // https://hono.dev/examples/file-upload
    // https://dev.to/aaronksaunders/quick-rest-api-file-upload-with-hono-js-and-drizzle-49ok
    const body = await c.req.parseBody();
    const file = body['file'];
    if (file === undefined || (Array.isArray(file) && file.length !== 1)) {
        return createProblemDetails(
            c,
            badRequest,
            'Keine oder mehrere Dateien hochgeladen',
        );
    }
    if (!(file instanceof File)) {
        return createProblemDetails(
            c,
            badRequest,
            `Ungueltiger Typ beim Upload: ${typeof file}`,
        );
    }

    const { name, size, type } = file;
    logger.debug('upload: name=%s, size=%d, type=%s', name, size, type);
    const buffer = Buffer.from(await file.arrayBuffer());
    const profileAvatar: ProfileAvatarCreated | undefined =
        await appProfileWriteService.uploadAvatar(id, buffer, name, size, type);
    logger.debug(
        'upload: id=%s, byteLength=%s, filename=%s, mimetype=%s',
        profileAvatar?.id,
        profileAvatar?.fileData.byteLength,
        profileAvatar?.filename,
        profileAvatar?.mimetype,
    );

    const location = `${createBaseUrl(c.req)}/file/${id}`;
    c.header('Location', location);
    return c.body(null, 204);
});

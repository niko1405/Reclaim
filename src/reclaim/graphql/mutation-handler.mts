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

import { GraphQLError } from 'graphql';
import { randomUUID } from 'node:crypto';
import { container } from '../../container.mts';
import { getLogger } from '../../logger/logger.mts';
import {
    AppProfilePostGraphQLSchema,
    AppProfileUpdateGraphQLSchema,
} from '../router/app-profile-validation.mts';
import { NotFoundError } from '../service/errors.mts';

type ID = string & { readonly __brand: 'ID' };
type Int = number & { readonly __brand: 'Int' };

type AppProfilePostInput = {
    readonly displayName: string;
    readonly avatarUrl?: string | null;
    readonly statusMessage?: string | null;
    readonly timezone: string;
    readonly currentStreak: number;
    readonly onboardingCompleted: boolean;
    readonly trackingConfig?: {
        readonly dailyLimitMinutes: number;
        readonly isPublic: boolean;
        readonly notificationsEnabled: boolean;
    } | null;
    readonly screentimeLogs?: Array<{
        readonly logDate: string;
        readonly totalMinutes: number;
        readonly topApp?: string | null;
    }> | null;
};

type AppProfileUpdateInput = {
    readonly id: ID;
    readonly version: Int;
    readonly displayName?: string;
    readonly avatarUrl?: string | null;
    readonly statusMessage?: string | null;
    readonly timezone?: string;
    readonly currentStreak?: number;
    readonly onboardingCompleted?: boolean;
};

type CreatePayload = { readonly id: ID };
type UpdatePayload = { readonly version: Int };
type DeletePayload = { readonly success: boolean };

const toID = (value: string | number): ID =>
    (typeof value === 'string' ? value : value.toString()) as ID;
const toInt = (value: number): Int => value as Int;

const toCreate = (appProfile: AppProfilePostInput) => ({
    id: randomUUID(),
    version: 0,
    displayName: appProfile.displayName,
    avatarUrl: appProfile.avatarUrl ?? null,
    statusMessage: appProfile.statusMessage ?? null,
    timezone: appProfile.timezone,
    currentStreak: appProfile.currentStreak,
    onboardingCompleted: appProfile.onboardingCompleted,
    ...(appProfile.trackingConfig === undefined ||
    appProfile.trackingConfig === null
        ? {}
        : {
              trackingConfig: {
                  create: {
                      dailyLimitMinutes:
                          appProfile.trackingConfig.dailyLimitMinutes,
                      isPublic: appProfile.trackingConfig.isPublic,
                      notificationsEnabled:
                          appProfile.trackingConfig.notificationsEnabled,
                  },
              },
          }),
    ...(appProfile.screentimeLogs === undefined ||
    appProfile.screentimeLogs === null
        ? {}
        : {
              screentimeLogs: {
                  create: appProfile.screentimeLogs.map((log) => ({
                      logDate: new Date(log.logDate),
                      totalMinutes: log.totalMinutes,
                      topApp: log.topApp ?? null,
                  })),
              },
          }),
});

const toUpdate = (appProfile: AppProfileUpdateInput) => {
    const appProfileUpdate: Record<string, unknown> = {
        version: { increment: 1 },
    };
    if (appProfile.displayName !== undefined)
        appProfileUpdate['displayName'] = appProfile.displayName;
    if (appProfile.avatarUrl !== undefined)
        appProfileUpdate['avatarUrl'] = appProfile.avatarUrl;
    if (appProfile.statusMessage !== undefined)
        appProfileUpdate['statusMessage'] = appProfile.statusMessage;
    if (appProfile.timezone !== undefined)
        appProfileUpdate['timezone'] = appProfile.timezone;
    if (appProfile.currentStreak !== undefined)
        appProfileUpdate['currentStreak'] = appProfile.currentStreak;
    if (appProfile.onboardingCompleted !== undefined)
        appProfileUpdate['onboardingCompleted'] =
            appProfile.onboardingCompleted;
    return appProfileUpdate;
};

const logger = getLogger('mutation-handler', 'file');
const { appProfileWriteService, keycloakService } = container;

// -----------------------------------------------------------------------------
// N e u a n l e g e n
// -----------------------------------------------------------------------------

// Validierung mit Zod
const validateAppProfilePost = (appProfile: AppProfilePostInput) => {
    try {
        AppProfilePostGraphQLSchema.parse(appProfile);
    } catch (err) {
        if (err instanceof Error) {
            const { message } = err;
            if (err.name === 'ZodError') {
                throw new GraphQLError(message, {
                    extensions: {
                        // https://the-guild.dev/graphql/yoga-server/docs/features/error-masking#error-codes-and-other-extensions
                        // https://www.apollographql.com/docs/apollo-server/data/errors
                        code: 'BAD_USER_INPUT',
                    },
                });
            } else {
                throw new GraphQLError(message, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                    },
                });
            }
        } else {
            throw new GraphQLError('Unbekannter Fehler', {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                },
            });
        }
    }

    logger.debug('validateAppProfilePost: ok');
};

export const createHandler = async (
    input: AppProfilePostInput,
): Promise<CreatePayload> => {
    logger.debug('createHandler: input=%o', input);

    // Validierung mit Zod
    validateAppProfilePost(input);

    const appProfileCreate = toCreate(input);
    logger.debug('createHandler: appProfileCreate=%o', appProfileCreate);
    const id = await appProfileWriteService.create(appProfileCreate as never);

    logger.debug('createHandler: id=%s', id);
    if (id === undefined) {
        throw new GraphQLError('Es konnte keine ID erzeugt werden.', {
            extensions: {
                code: 'INTERNAL_SERVER_ERROR',
            },
        });
    }

    return { id: toID(id) };
};

// -----------------------------------------------------------------------------
// A e n d e r n
// -----------------------------------------------------------------------------

// Validierung mit Zod
const validateAppProfileUpdate = (appProfile: AppProfileUpdateInput) => {
    try {
        AppProfileUpdateGraphQLSchema.parse(appProfile);
    } catch (err) {
        if (err instanceof Error) {
            const { message } = err;
            if (err.name === 'ZodError') {
                throw new GraphQLError(message, {
                    extensions: {
                        // https://the-guild.dev/graphql/yoga-server/docs/features/error-masking#error-codes-and-other-extensions
                        // https://www.apollographql.com/docs/apollo-server/data/errors
                        code: 'BAD_USER_INPUT',
                    },
                });
            } else {
                throw new GraphQLError(message, {
                    extensions: {
                        code: 'INTERNAL_SERVER_ERROR',
                    },
                });
            }
        } else {
            throw new GraphQLError('Unbekannter Fehler', {
                extensions: {
                    code: 'INTERNAL_SERVER_ERROR',
                },
            });
        }
    }

    logger.debug('validateAppProfileUpdate: ok');
};

export const updateHandler = async (
    input: AppProfileUpdateInput,
): Promise<UpdatePayload> => {
    logger.debug('updateHandler: input=%o', input);

    // Validierung mit Zod
    validateAppProfileUpdate(input);

    const appProfileUpdate = toUpdate(input);
    logger.debug('updateHandler: appProfileUpdate=%o', appProfileUpdate);

    let version: number | undefined;
    try {
        version = await appProfileWriteService.update({
            id: input.id,
            appProfile: toUpdate(input) as never,
            version: `"${input.version}"`,
        });
    } catch (err) {
        if (err instanceof NotFoundError) {
            logger.debug('updateHandler: Kein AppProfile gefunden.');
            throw new GraphQLError(err.message, {
                extensions: {
                    code: 'BAD_USER_INPUT',
                },
            });
        }
    }

    logger.debug('updateHandler: version=%s', version);
    return { version: toInt(version ?? 0) };
};

// -----------------------------------------------------------------------------
// L o e s c h e n
// -----------------------------------------------------------------------------
export const deleteHandler = async (id: ID) => {
    logger.debug('deleteHandler: id=%s', id);
    const success = await appProfileWriteService.delete(id);
    const payload: DeletePayload = { success };
    return payload;
};

// -----------------------------------------------------------------------------
// S e c u r i t y
// -----------------------------------------------------------------------------
export const tokenHandler = async ({
    username,
    password,
}: {
    username: string;
    password: string;
}) => {
    logger.debug('tokenHandler: username=%s', username);
    const token = await keycloakService.token({ username, password });
    if (token === undefined) {
        throw new GraphQLError('Fehler bei username und/oder Passwort', {
            extensions: {
                code: 'BAD_USER_INPUT',
            },
        });
    }
    logger.debug('tokenHandler: token=%o', token);
    return token;
};

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
import { container } from '../../container.mts';
import { getLogger } from '../../logger/logger.mts';
import {
    type AppProfileWithTrackingConfig,
    type AppProfileWithTrackingConfigAndScreentimeLogs,
} from '../service/app-profile-service.mts';
import { NotFoundError } from '../service/errors.mts';
import { createPageable } from '../service/pageable.mts';
import { type Slice } from '../service/slice.mts';

type ID = string & { readonly __brand: 'ID' };

type SuchParameterInput = {
    readonly displayName?: string;
    readonly avatarUrl?: string;
    readonly statusMsg?: string;
    readonly timezone?: string;
    readonly currentStreak?: number;
    readonly onBoardingCompleted?: boolean;
    readonly erzeugt?: string;
    readonly aktualisiert?: string;
};

type AppProfile = {
    readonly id: ID;
    readonly version: number;
    readonly displayName: string;
    readonly avatarUrl: string | null;
    readonly statusMessage: string | null;
    readonly timezone: string;
    readonly currentStreak: number;
    readonly onboardingCompleted: boolean;
    readonly erzeugt: string;
    readonly aktualisiert: string;
    readonly trackingConfig: {
        readonly id: ID;
        readonly dailyLimitMinutes: number;
        readonly isPublic: boolean;
        readonly notificationsEnabled: boolean;
        readonly erzeugt: string;
        readonly aktualisiert: string;
    } | null;
    readonly screentimeLogs: Array<{
        readonly id: ID;
        readonly logDate: string;
        readonly totalMinutes: number;
        readonly topApp: string | null;
        readonly erzeugt: string;
        readonly aktualisiert: string;
    }> | null;
};

const toID = (value: string | number): ID =>
    (typeof value === 'string' ? value : value.toString()) as ID;

const toAppProfileType = (
    appProfile: AppProfileWithTrackingConfigAndScreentimeLogs,
): AppProfile => {
    const trackingConfig = appProfile.trackingConfig;
    const screentimeLogs = appProfile.screentimeLogs;

    return {
        id: toID(appProfile.id),
        version: appProfile.version,
        displayName: appProfile.displayName,
        avatarUrl: appProfile.avatarUrl,
        statusMessage: appProfile.statusMessage,
        timezone: appProfile.timezone,
        currentStreak: appProfile.currentStreak,
        onboardingCompleted: appProfile.onboardingCompleted,
        erzeugt: appProfile.erzeugt.toISOString(),
        aktualisiert: appProfile.aktualisiert.toISOString(),
        trackingConfig:
            trackingConfig === null
                ? null
                : {
                      id: toID(trackingConfig.id),
                      dailyLimitMinutes: trackingConfig.dailyLimitMinutes,
                      isPublic: trackingConfig.isPublic,
                      notificationsEnabled: trackingConfig.notificationsEnabled,
                      erzeugt: trackingConfig.erzeugt.toISOString(),
                      aktualisiert: trackingConfig.aktualisiert.toISOString(),
                  },
        screentimeLogs:
            screentimeLogs === null
                ? null
                : screentimeLogs.map((log) => ({
                      id: toID(log.id),
                      logDate: log.logDate.toISOString(),
                      totalMinutes: log.totalMinutes,
                      topApp: log.topApp,
                      erzeugt: log.erzeugt.toISOString(),
                      aktualisiert: log.aktualisiert.toISOString(),
                  })),
    };
};

const toSuchparameter = (param?: SuchParameterInput) => {
    if (param === undefined) {
        return undefined;
    }

    const suchparameter: Record<string, unknown> = {};
    if (param.displayName !== undefined)
        suchparameter['displayName'] = param.displayName;
    if (param.avatarUrl !== undefined)
        suchparameter['avatarUrl'] = param.avatarUrl;
    if (param.statusMsg !== undefined)
        suchparameter['statusMsg'] = param.statusMsg;
    if (param.timezone !== undefined)
        suchparameter['timezone'] = param.timezone;
    if (param.currentStreak !== undefined)
        suchparameter['currentStreak'] = param.currentStreak;
    if (param.onBoardingCompleted !== undefined)
        suchparameter['onBoardingCompleted'] = param.onBoardingCompleted;
    if (param.erzeugt !== undefined) suchparameter['erzeugt'] = param.erzeugt;
    if (param.aktualisiert !== undefined)
        suchparameter['aktualisiert'] = param.aktualisiert;
    return suchparameter;
};

const logger = getLogger('query-handler', 'file');

export const appProfileHandler = async (id: ID) => {
    logger.debug('appProfileHandler: id=%s', id);

    let appProfile: AppProfile;
    try {
        const appProfileDb: AppProfileWithTrackingConfigAndScreentimeLogs =
            await container.appProfileService.findById({ id });
        appProfile = toAppProfileType(appProfileDb);
    } catch (err) {
        if (err instanceof NotFoundError) {
            logger.debug('appProfileHandler: Kein AppProfile gefunden.');
            throw new GraphQLError(err.message, {
                extensions: {
                    code: 'BAD_USER_INPUT',
                },
            });
        }

        const message = (err as Error).message;
        throw new GraphQLError(message, {
            extensions: {
                code: 'INTERNAL_SERVER_ERROR',
            },
        });
    }

    logger.debug('appProfileHandler: result=%o', appProfile);
    return appProfile;
};

export const appProfilesHandler = async (
    input?: SuchParameterInput | undefined,
) => {
    logger.debug('appProfilesHandler: input=%o', input ?? 'undefined');
    const pageable = createPageable({});
    const suchparameter = toSuchparameter(input);

    let appProfileSlice: Readonly<
        Slice<Readonly<AppProfileWithTrackingConfig>>
    >;
    try {
        appProfileSlice = await container.appProfileService.find(
            suchparameter,
            pageable,
        );
    } catch (err) {
        if (err instanceof NotFoundError) {
            logger.debug('Keine AppProfiles gefunden.');
            throw new GraphQLError(err.message, {
                extensions: {
                    code: 'BAD_USER_INPUT',
                },
            });
        }

        const message = (err as Error).message;
        throw new GraphQLError(message, {
            extensions: {
                code: 'INTERNAL_SERVER_ERROR',
            },
        });
    }

    logger.debug('appProfilesHandler: appProfileSlice=%o', appProfileSlice);
    const result = appProfileSlice.content.map((appProfile) =>
        toAppProfileType(
            appProfile as AppProfileWithTrackingConfigAndScreentimeLogs,
        ),
    );
    logger.debug('appProfilesHandler: result=%o', result);
    return result;
};

export const buchHandler = appProfileHandler;
export const buecherHandler = appProfilesHandler;

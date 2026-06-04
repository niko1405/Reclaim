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

import { randomUUID } from 'node:crypto';
import { type AppProfileWithTrackingConfigAndScreentimeLogs } from '../service/app-profile-service.mts';
import {
    type AppProfileCreate,
    type AppProfileUpdate,
} from '../service/app-profile-write-service.mts';
import { type QueryParams } from '../service/queryparams.mts';

// -----------------------------------------------------------------------------
// I D   u n d   I n t   f u e r   G r a p h Q L
// -----------------------------------------------------------------------------

// Ein "branded type" bleibt derselbe Typ im Typsystem, erhaelt aber eine
// zusaetzliche Property, die NUR im Typsystem verfuegbar ist.
export type ID = string & { readonly __brand: 'ID' };
export type Int = number & { readonly __brand: 'Int' };

export const toID = (value: string | number): ID => {
    if (typeof value === 'string') {
        return value as ID;
    }
    return value.toString() as ID;
};

export const toInt = (num: number): Int =>
    (Number.isInteger(num) ? num : Math.round(num)) as Int;

export const toNumber = (id: ID): number => Number.parseInt(id, 10);

const toLogDate = (dateStr: string): Date => new Date(dateStr);

// -----------------------------------------------------------------------------
// G r a p h Q L   S c h e m a
// -----------------------------------------------------------------------------
export const typeDefs = /* GraphQL */ `
    "Read-Operations for AppProfiles"
    type Query {
        appProfile(id: ID!): AppProfile!
        appProfiles(input: SuchParameterInput): [AppProfile!]!
    }

    "AppProfiles neu anlegen, aktualisieren oder loeschen"
    type Mutation {
        create(input: AppProfilePostInput!): CreatePayload!
        update(input: AppProfileUpdateInput!): UpdatePayload
        delete(id: ID!): DeletePayload
        token(username: String!, password: String!): TokenPayload
    }

    "Datenschema zu einem AppProfile, das gelesen wird"
    type AppProfile {
        id: ID!
        version: Int!
        displayName: String!
        avatarUrl: String
        statusMessage: String
        timezone: String!
        currentStreak: Int!
        onboardingCompleted: Boolean!
        erzeugt: String!
        aktualisiert: String!
        trackingConfig: TrackingConfig
        screentimeLogs: [ScreentimeLog!]
    }

    "Daten zur TrackingConfig eines AppProfiles, die gelesen werden"
    type TrackingConfig {
        id: ID!
        dailyLimitMinutes: Int!
        isPublic: Boolean!
        notificationsEnabled: Boolean!
        erzeugt: String!
        aktualisiert: String!
    }

    "Daten zu einem ScreentimeLog eines AppProfiles"
    type ScreentimeLog {
        id: ID!
        logDate: String!
        totalMinutes: Int!
        topApp: String
        erzeugt: String!
        aktualisiert: String!
    }

    "Generierte ID bei erfolgreichem Neuanlegen"
    type CreatePayload {
        id: ID!
    }

    "Neue Versionsnummer als Resultat bei erfolgreichem Aktualisieren"
    type UpdatePayload {
        version: Int
    }

    "Flag, ob das Loeschen durchgefuehrt wurde"
    type DeletePayload {
        success: Boolean
    }

    "Access- und Refresh-Token einschliesslich Ablauf-Zeitstempel"
    type TokenPayload {
        access_token: String!
        expires_in: Int!
        refresh_token: String!
        refresh_expires_in: Int!
    }

    "Suchparameter für die Suche nach AppProfiles"
    input SuchParameterInput {
        displayName: String
        avatarUrl: String
        statusMsg: String
        timezone: String
        currentStreak: Int
        onBoardingCompleted: Boolean
        erzeugt: String
        aktualisiert: String
    }

    "Daten für ein neues AppProfile"
    input AppProfilePostInput {
        displayName: String!
        avatarUrl: String
        statusMessage: String
        timezone: String!
        currentStreak: Int!
        onboardingCompleted: Boolean!
        trackingConfig: TrackingConfigInput
        screentimeLogs: [ScreentimeLogInput!]
    }

    "Daten zur TrackingConfig eines AppProfiles"
    input TrackingConfigInput {
        dailyLimitMinutes: Int!
        isPublic: Boolean!
        notificationsEnabled: Boolean!
    }

    "Daten zu den ScreentimeLogs eines AppProfiles"
    input ScreentimeLogInput {
        logDate: String!
        totalMinutes: Int!
        topApp: String
    }

    "Daten für ein zu änderndes AppProfile"
    input AppProfileUpdateInput {
        id: ID!
        version: Int!
        displayName: String
        avatarUrl: String
        statusMessage: String
        timezone: String
        currentStreak: Int
        onboardingCompleted: Boolean
    }
`;

// -----------------------------------------------------------------------------
// E n t i t y   m a p p i n g s
// -----------------------------------------------------------------------------
export type TrackingConfig = {
    readonly id: ID;
    readonly dailyLimitMinutes: Int;
    readonly isPublic: boolean;
    readonly notificationsEnabled: boolean;
    readonly erzeugt: string;
    readonly aktualisiert: string;
};

export type ScreentimeLog = {
    readonly id: ID;
    readonly logDate: string;
    readonly totalMinutes: Int;
    readonly topApp: string | null;
    readonly erzeugt: string;
    readonly aktualisiert: string;
};

export type AppProfile = {
    readonly id: ID;
    readonly version: Int;
    readonly displayName: string;
    readonly avatarUrl: string | null;
    readonly statusMessage: string | null;
    readonly timezone: string;
    readonly currentStreak: Int;
    readonly onboardingCompleted: boolean;
    readonly erzeugt: string;
    readonly aktualisiert: string;
    readonly trackingConfig: TrackingConfig | null;
    readonly screentimeLogs: ScreentimeLog[] | null;
};

export const toAppProfileType = (
    appProfile: AppProfileWithTrackingConfigAndScreentimeLogs,
): AppProfile => {
    const trackingConfig = appProfile.trackingConfig;
    const screentimeLogs = appProfile.screentimeLogs;

    return {
        id: toID(appProfile.id),
        version: toInt(appProfile.version),
        displayName: appProfile.displayName,
        avatarUrl: appProfile.avatarUrl,
        statusMessage: appProfile.statusMessage,
        timezone: appProfile.timezone,
        currentStreak: toInt(appProfile.currentStreak),
        onboardingCompleted: appProfile.onboardingCompleted,
        erzeugt: appProfile.erzeugt.toISOString(),
        aktualisiert: appProfile.aktualisiert.toISOString(),
        trackingConfig:
            trackingConfig === null
                ? null
                : {
                      id: toID(trackingConfig.id),
                      dailyLimitMinutes: toInt(
                          trackingConfig.dailyLimitMinutes,
                      ),
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
                      totalMinutes: toInt(log.totalMinutes),
                      topApp: log.topApp,
                      erzeugt: log.erzeugt.toISOString(),
                      aktualisiert: log.aktualisiert.toISOString(),
                  })),
    };
};

export type SuchParameterInput = {
    displayName?: string | undefined;
    avatarUrl?: string | undefined;
    statusMsg?: string | undefined;
    timezone?: string | undefined;
    currentStreak?: Int | undefined;
    onBoardingCompleted?: boolean | undefined;
    erzeugt?: string | undefined;
    aktualisiert?: string | undefined;
};

export const toSuchparameter = (param?: SuchParameterInput) => {
    if (param === undefined) {
        return undefined;
    }

    const {
        displayName,
        avatarUrl,
        statusMsg,
        timezone,
        currentStreak,
        onBoardingCompleted,
        erzeugt,
        aktualisiert,
    } = param;
    const suchparameter: Record<string, any> = {};
    if (displayName !== undefined) {
        suchparameter['displayName'] = displayName;
    }
    if (avatarUrl !== undefined) {
        suchparameter['avatarUrl'] = avatarUrl;
    }
    if (statusMsg !== undefined) {
        suchparameter['statusMsg'] = statusMsg;
    }
    if (timezone !== undefined) {
        suchparameter['timezone'] = timezone;
    }
    if (currentStreak !== undefined) {
        suchparameter['currentStreak'] = currentStreak;
    }
    if (onBoardingCompleted !== undefined) {
        suchparameter['onBoardingCompleted'] = onBoardingCompleted;
    }
    if (erzeugt !== undefined) {
        suchparameter['erzeugt'] = erzeugt;
    }
    if (aktualisiert !== undefined) {
        suchparameter['aktualisiert'] = aktualisiert;
    }
    return suchparameter as QueryParams;
};

// -----------------------------------------------------------------------------
// N e u a n l e g e n
// -----------------------------------------------------------------------------
export type AppProfilePostInput = {
    displayName: string;
    avatarUrl?: string | null | undefined;
    statusMessage?: string | null | undefined;
    timezone: string;
    currentStreak: Int;
    onboardingCompleted: boolean;
    trackingConfig?: {
        dailyLimitMinutes: Int;
        isPublic: boolean;
        notificationsEnabled: boolean;
    } | null;
    screentimeLogs?: Array<{
        logDate: string;
        totalMinutes: Int;
        topApp?: string | null | undefined;
    }> | null;
};

export type AppProfileNeuInput = AppProfilePostInput;

export const toCreate = (appProfile: AppProfilePostInput): AppProfileCreate => {
    const appProfileCreate: AppProfileCreate = {
        id: randomUUID(),
        version: 0,
        displayName: appProfile.displayName,
        avatarUrl: appProfile.avatarUrl ?? null,
        statusMessage: appProfile.statusMessage ?? null,
        timezone: appProfile.timezone,
        currentStreak: appProfile.currentStreak,
        onboardingCompleted: appProfile.onboardingCompleted,
    };

    if (
        appProfile.trackingConfig !== undefined &&
        appProfile.trackingConfig !== null
    ) {
        appProfileCreate.trackingConfig = {
            create: {
                dailyLimitMinutes: appProfile.trackingConfig.dailyLimitMinutes,
                isPublic: appProfile.trackingConfig.isPublic,
                notificationsEnabled:
                    appProfile.trackingConfig.notificationsEnabled,
            },
        };
    }

    if (
        appProfile.screentimeLogs !== undefined &&
        appProfile.screentimeLogs !== null
    ) {
        appProfileCreate.screentimeLogs = {
            create: appProfile.screentimeLogs.map((log) => ({
                logDate: toLogDate(log.logDate),
                totalMinutes: log.totalMinutes,
                topApp: log.topApp ?? null,
            })),
        };
    }

    return appProfileCreate;
};

export type CreatePayload = {
    readonly id: ID;
};

// -----------------------------------------------------------------------------
// A e n d e r n
// -----------------------------------------------------------------------------
export type AppProfileUpdateInput = {
    id: ID;
    version: Int;
    displayName?: string | undefined;
    avatarUrl?: string | null | undefined;
    statusMessage?: string | null | undefined;
    timezone?: string | undefined;
    currentStreak?: Int | undefined;
    onboardingCompleted?: boolean | undefined;
};

export type AppProfileUpdateInput = AppProfileUpdateInput;

export const toUpdate = (
    appProfile: AppProfileUpdateInput,
): AppProfileUpdate => {
    const appProfileUpdate: AppProfileUpdate = {
        version: appProfile.version,
    };

    if (appProfile.displayName !== undefined) {
        appProfileUpdate.displayName = appProfile.displayName;
    }
    if (appProfile.avatarUrl !== undefined) {
        appProfileUpdate.avatarUrl = appProfile.avatarUrl;
    }
    if (appProfile.statusMessage !== undefined) {
        appProfileUpdate.statusMessage = appProfile.statusMessage;
    }
    if (appProfile.timezone !== undefined) {
        appProfileUpdate.timezone = appProfile.timezone;
    }
    if (appProfile.currentStreak !== undefined) {
        appProfileUpdate.currentStreak = appProfile.currentStreak;
    }
    if (appProfile.onboardingCompleted !== undefined) {
        appProfileUpdate.onboardingCompleted = appProfile.onboardingCompleted;
    }

    return appProfileUpdate;
};

export type UpdatePayload = {
    readonly version: Int;
};

// -----------------------------------------------------------------------------
// L o e s c h e n
// -----------------------------------------------------------------------------
export type DeletePayload = {
    readonly success: boolean;
};

// -----------------------------------------------------------------------------
// S e c u r i t y
// -----------------------------------------------------------------------------
export type TokenPayload = {
    readonly access_token: string;
    readonly expires_in: Int;
    readonly refresh_token: string;
    readonly refresh_expires_in: Int;
};

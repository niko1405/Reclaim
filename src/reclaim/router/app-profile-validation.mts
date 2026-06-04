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
// along with this program. If not, see <http://www.gnu.org/licenses/>.

import { z } from 'zod';

export const MAX_RATING = 5;

const AppProfileComplete = z.strictObject({
    id: z.string().uuid(),
    displayName: z.string().min(1).max(120),
    avatarUrl: z
        .string()
        .regex(/^https?:\/\/[^\s"']+$/u, 'Ungültige Avatar-URL')
        .optional(),
    statusMessage: z.string().max(240).optional(),
    timezone: z
        .string()
        .regex(
            /^(?:[A-Za-z]+(?:\/[A-Za-z0-9._+-]+)+(?:\/[A-Za-z0-9._+-]+)?|UTC(?:[+-](?:0?[0-9]|1[0-4]))?)$/u,
            'Ungültige Zeitzone',
        ),
    currentStreak: z.int().gte(0),
    onboardingCompleted: z.boolean(),
    version: z.int().gte(0),
    trackingConfig: z
        .strictObject({
            id: z.int().positive(),
            dailyLimitMinutes: z.int().gte(0),
            isPublic: z.boolean(),
            notificationsEnabled: z.boolean(),
            profileId: z.string().uuid(),
            erzeugt: z.coerce.date(),
            aktualisiert: z.coerce.date(),
        })
        .optional(),
    screentimeLogs: z
        .array(
            z.strictObject({
                id: z.int().positive(),
                logDate: z.coerce.date(),
                totalMinutes: z.int().gte(0),
                topApp: z.string().max(120).optional().nullable(),
            }),
        )
        .optional(),
});

const TrackingConfigGraphQLPostSchema = AppProfileComplete.shape.trackingConfig
    .unwrap()
    .omit({
        id: true,
        profileId: true,
        erzeugt: true,
        aktualisiert: true,
    });

const ScreentimeLogGraphQLPostSchema = AppProfileComplete.shape.screentimeLogs
    .unwrap()
    .element.omit({
        id: true,
    });

export const AppProfilePostGraphQLSchema = AppProfileComplete.omit({
    id: true,
    version: true,
})
    .extend({
        trackingConfig: TrackingConfigGraphQLPostSchema.optional(),
        screentimeLogs: z.array(ScreentimeLogGraphQLPostSchema).optional(),
    })
    .readonly();

export const AppProfilePostSchema = AppProfileComplete.omit({
    id: true,
    version: true,
}).readonly();

export const AppProfileUpdateSchema = AppProfileComplete.omit({
    id: true,
    version: true,
    trackingConfig: true,
    screentimeLogs: true,
}).readonly();

export const AppProfileUpdateGraphQLSchema = AppProfileComplete.omit({
    trackingConfig: true,
    screentimeLogs: true,
})
    .partial()
    .extend({
        id: z.string().uuid(),
        version: z.number().gte(0),
    })
    .readonly();

export type AppProfilePostType = z.infer<typeof AppProfilePostSchema>;
export type AppProfileUpdateType = z.infer<typeof AppProfileUpdateSchema>;

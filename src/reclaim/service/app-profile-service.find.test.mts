// Copyright (C) 2025 - present Juergen Zimmermann, Hochschule Karlsruhe
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

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PrismaClient } from '../../generated/prisma/client.ts';
import {
    type AppProfileWithTrackingConfigAndScreentimeLogs,
    AppProfileService,
} from './app-profile-service.mts';
import { type Pageable } from './pageable.mts';
import { type QueryParams } from './queryparams.mts';

// Hoisting: wird an den (Datei-) Anfang verschoben
const { findManyMock, countMock } = vi.hoisted(() => ({
    findManyMock: vi.fn<PrismaClient['appProfile']['findMany']>(),
    countMock: vi.fn<PrismaClient['appProfile']['count']>(),
}));

// vi.mock() bewirkt Hoisting
vi.mock('../../config/prisma-client.mts', () => ({
    prismaClient: {
        buch: {
            findMany: findManyMock,
            count: countMock,
        },
    },
}));

describe('AppProfileService find', () => {
    let service: AppProfileService;

    beforeEach(() => {
        service = new AppProfileService();
        findManyMock.mockReset();
        countMock.mockReset();
    });

    test('displayName vorhanden', async () => {
        // given
        const displayName = 'Profil';
        const suchparameter: QueryParams = { displayName };
        const pageable: Pageable = { number: 1, size: 5 };
        const appProfileMock: AppProfileWithTrackingConfigAndScreentimeLogs = {
            id: '550e8400-e29b-41d4-a716-446655440001',
            displayName,
            avatarUrl: null,
            statusMessage: null,
            timezone: 'Europe/Berlin',
            currentStreak: 0,
            onboardingCompleted: false,
            version: 0,
            erzeugt: new Date(),
            aktualisiert: new Date(),
            trackingConfig: {
                id: 1,
                dailyLimitMinutes: 120,
                isPublic: false,
                notificationsEnabled: true,
                profileId: '550e8400-e29b-41d4-a716-446655440001',
                erzeugt: new Date(),
                aktualisiert: new Date(),
            },
            screentimeLogs: [],
        };
        // return von prismaClient.appProfile.findMany()
        findManyMock.mockResolvedValueOnce([appProfileMock]);
        // return von prismaClient.appProfile.count()
        countMock.mockResolvedValueOnce(1);

        // when
        const result = await service.find(suchparameter, pageable);

        // then
        const { content } = result;

        expect(content).toHaveLength(1);
        expect(content[0]).toStrictEqual(appProfileMock);
    });

    test('displayName nicht vorhanden', async () => {
        // given
        const displayName = 'Profil';
        const suchparameter: QueryParams = { displayName };
        const pageable: Pageable = { number: 1, size: 5 };
        findManyMock.mockResolvedValue([]);

        // when / then
        await expect(service.find(suchparameter, pageable)).rejects.toThrow(
            /^Keine Buecher gefunden/,
        );
    });
});

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

// Hoisting: wird an den (Datei-) Anfang verschoben
const { findUniqueMock } = vi.hoisted(() => ({
    findUniqueMock: vi.fn<PrismaClient['appProfile']['findUnique']>(),
}));

// vi.mock() bewirkt Hoisting
vi.mock('../../config/prisma-client.mts', () => ({
    prismaClient: {
        appProfile: {
            findUnique: findUniqueMock,
        },
    },
}));

describe('AppProfileService findById', () => {
    let service: AppProfileService;

    beforeEach(() => {
        service = new AppProfileService();
        findUniqueMock.mockReset();
    });

    test('id vorhanden', async () => {
        // given
        const id = '550e8400-e29b-41d4-a716-446655440001';
        const appProfileMock: Readonly<AppProfileWithTrackingConfigAndScreentimeLogs> =
            {
                id,
                displayName: 'Profil',
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
                    profileId: id,
                    erzeugt: new Date(),
                    aktualisiert: new Date(),
                },
                screentimeLogs: [],
            };
        // return von prismaClient.appProfile.findUnique()
        findUniqueMock.mockResolvedValueOnce(appProfileMock);

        // when
        const appProfile = await service.findById({ id });

        // then
        expect(appProfile).toStrictEqual(appProfileMock);
    });

    test('id nicht vorhanden', async () => {
        // given
        const id = '00000000-0000-0000-0000-000000000000';
        findUniqueMock.mockResolvedValue(null);

        // when / then
        await expect(service.findById({ id })).rejects.toThrow(
            `Es gibt kein AppProfile mit der ID ${id}.`,
        );
    });
});

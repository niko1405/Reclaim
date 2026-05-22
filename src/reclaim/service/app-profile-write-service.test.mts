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
import { Prisma } from '../../generated/prisma/client.ts';
import { AppProfileService } from './app-profile-service.mts';
import {
    type AppProfileCreate,
    AppProfileWriteService,
} from './app-profile-write-service.mts';

// Hoisting: wird an den (Datei-) Anfang verschoben
const { createMock, countMock, transactionMock, sendmailMock } = vi.hoisted(
    () => ({
        createMock: vi.fn<Prisma.AppProfileDelegate['create']>(),
        countMock: vi.fn<Prisma.AppProfileDelegate['count']>(),
        transactionMock: vi.fn(), // eslint-disable-line vitest/require-mock-type-parameters
        sendmailMock: vi.fn(),
    }),
);

// vi.mock() bewirkt Hoisting
vi.mock('../../config/prisma-client.mts', () => ({
    prismaClient: {
        appProfile: {
            create: createMock,
            count: countMock,
        },
        $transaction: transactionMock,
    },
}));

vi.mock('../../mail/sendmail.mts', () => ({
    sendmail: sendmailMock,
}));

describe('AppProfileWriteService create', () => {
    let service: AppProfileWriteService;
    let readService: AppProfileService;

    beforeEach(() => {
        readService = new AppProfileService();
        service = new AppProfileWriteService(readService);

        createMock.mockReset();
        countMock.mockReset();
        transactionMock.mockReset();
        sendmailMock.mockReset();

        transactionMock.mockImplementation(async (callback) =>
            callback({
                appProfile: {
                    create: createMock,
                    count: countMock,
                },
            }),
        );
    });

    test('Neues AppProfile', async () => {
        // given
        const idMock = '550e8400-e29b-41d4-a716-446655440001';
        const appProfile: AppProfileCreate = {
            id: idMock,
            displayName: 'Beispiel',
            avatarUrl: null,
            statusMessage: 'beispiel',
            timezone: 'Europe/Berlin',
            currentStreak: 0,
            onboardingCompleted: true,
            version: 0,
            trackingConfig: {
                create: {
                    dailyLimitMinutes: 120,
                    isPublic: false,
                    notificationsEnabled: true,
                },
            },
            screentimeLogs: {
                create: [
                    {
                        logDate: new Date(),
                        totalMinutes: 99,
                        topApp: 'Browser',
                    },
                ],
            },
        };
        const appProfileTmp: any = {
            ...appProfile,
            erzeugt: new Date(),
            aktualisiert: new Date(),
            trackingConfig: {
                id: 11,
                dailyLimitMinutes: 120,
                isPublic: false,
                notificationsEnabled: true,
                profileId: idMock,
                erzeugt: new Date(),
                aktualisiert: new Date(),
            },
            screentimeLogs: [
                {
                    id: 21,
                    logDate: new Date(),
                    totalMinutes: 99,
                    topApp: 'Browser',
                    profileId: idMock,
                    erzeugt: new Date(),
                    aktualisiert: new Date(),
                },
            ],
        };
        // return von tx.appProfile.create()
        createMock.mockResolvedValue(appProfileTmp);
        // sendmail ist eine void-Funktion
        sendmailMock.mockResolvedValue(undefined);

        // when
        const id = await service.create(appProfile);

        // then
        expect(id).toBe(idMock);
        expect(sendmailMock).toHaveBeenCalledTimes(1);
    });
});

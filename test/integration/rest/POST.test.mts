import { beforeAll, describe, expect, test } from 'vitest';
import { type AppProfilePostType } from '../../../src/reclaim/router/app-profile-validation.mts';
import {
    APPLICATION_JSON,
    AUTHORIZATION,
    BEARER,
    CONTENT_TYPE,
    LOCATION,
    POST,
    restURL,
} from '../constants.mts';
import { getToken } from '../token.mts';

const neuesAppProfile: AppProfilePostType = {
    displayName: 'Post Test User',
    avatarUrl: 'https://example.com/avatar/post-test.png',
    statusMessage: 'Created by POST test',
    timezone: 'Europe/Berlin',
    currentStreak: 1,
    onboardingCompleted: true,
    trackingConfig: {
        id: 999,
        dailyLimitMinutes: 120,
        isPublic: true,
        notificationsEnabled: true,
        profileId: '550e8400-e29b-41d4-a716-446655449999',
        erzeugt: new Date('2026-01-01T00:00:00Z'),
        aktualisiert: new Date('2026-01-01T00:00:00Z'),
    },
    screentimeLogs: [
        {
            id: 999,
            logDate: new Date('2026-01-01T00:00:00Z'),
            totalMinutes: 45,
            topApp: 'Browser',
        },
    ],
};

describe('POST /rest', () => {
    let token: string;

    beforeAll(async () => {
        token = await getToken('admin', 'p');
    });

    test('Neues AppProfile', async () => {
        // given
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(restURL, {
            method: POST,
            body: JSON.stringify(neuesAppProfile),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(201);

        const responseHeaders = response.headers;
        const location = responseHeaders.get(LOCATION);

        expect(location).toBeDefined();

        const indexLastSlash = location?.lastIndexOf('/') ?? -1;

        expect(indexLastSlash).not.toBe(-1);

        const id = location?.slice(indexLastSlash + 1);

        expect(id).toBeDefined();
        expect(id).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu,
        );
    });
});

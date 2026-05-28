import { beforeAll, describe, expect, test } from 'vitest';
import { type AppProfileUpdateType } from '../../../src/reclaim/router/app-profile-validation.mts';
import {
    APPLICATION_JSON,
    AUTHORIZATION,
    BEARER,
    CONTENT_TYPE,
    IF_MATCH,
    PUT,
    restURL,
} from '../constants.mts';
import { getToken } from '../token.mts';

const geaendertesAppProfile: AppProfileUpdateType = {
    displayName: 'PUT Test User',
    avatarUrl: 'https://example.com/avatar/put-test.png',
    statusMessage: 'Updated by PUT test',
    timezone: 'Europe/Berlin',
    currentStreak: 7,
    onboardingCompleted: true,
};

const idVorhanden = '550e8400-e29b-41d4-a716-446655440001';
const idNichtVorhanden = '550e8400-e29b-41d4-a716-446655449999';

const geaendertesAppProfileInvalid: Record<string, unknown> = {
    displayName: '',
    avatarUrl: 'ungueltige-url',
    statusMessage: 'x'.repeat(241),
    timezone: 'ungueltige-zeitzone',
    currentStreak: -1,
    onboardingCompleted: 'ja',
};

describe('PUT /rest/:id', () => {
    let token: string;

    beforeAll(async () => {
        token = await getToken('admin', 'p');
    });

    test('Vorhandenes AppProfile aendern', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"0"');
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const { status } = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaendertesAppProfile),
            headers,
        });

        // then
        expect(status).toBe(204);
    });

    test('Nicht-vorhandenes AppProfile aendern', async () => {
        // given
        const url = `${restURL}/${idNichtVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"0"');
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const { status } = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaendertesAppProfile),
            headers,
        });

        // then
        expect(status).toBe(404);
    });

    test('Vorhandenes AppProfile aendern, aber ohne Versionsnummer', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const { status } = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaendertesAppProfile),
            headers,
        });

        // then
        expect(status).toBe(428);
    });

    test('Vorhandenes AppProfile aendern, aber mit alter Versionsnummer', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"-1"');
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const { status } = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaendertesAppProfile),
            headers,
        });

        // then
        expect(status).toBe(412);
    });

    test('Vorhandenes AppProfile aendern, aber mit falschen Daten', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"0"');
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const { status } = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaendertesAppProfileInvalid),
            headers,
        });

        // then
        expect(status).toBe(422);
    });

    test('Vorhandenes AppProfile aendern, aber ohne Token', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"0"');

        // when
        const { status } = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaendertesAppProfile),
            headers,
        });

        // then
        expect(status).toBe(401);
    });
});

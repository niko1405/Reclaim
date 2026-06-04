import { describe, expect, test } from 'vitest';
import { CONTENT_TYPE, IF_NONE_MATCH, restURL } from '../constants.mts';

const idsETag = [
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
];
const ids = [
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
];
const idNichtVorhanden = '550e8400-e29b-41d4-a716-446655449999';
const idFalsch = 'abc';

describe('GET /rest/:id', () => {
    test.concurrent.each(ids)('AppProfile zu vorhandener ID %s', async (id) => {
        // given
        const url = `${restURL}/${id}`;
        const requestHeaders = new Headers();
        requestHeaders.append('Accept', 'application/json');

        // when
        const response = await fetch(url, { headers: requestHeaders });
        const { status, headers } = response;

        // then
        expect(status).toBe(200);
        expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

        const body = (await response.json()) as {
            id: string;
            displayName: string;
        };

        expect(body.id).toBe(id);
        expect(body.displayName).toBeDefined();
    });

    test.concurrent('Kein AppProfile zu nicht-vorhandener ID', async () => {
        // given
        const url = `${restURL}/${idNichtVorhanden}`;
        const requestHeaders = new Headers();
        requestHeaders.append('Accept', 'application/json');

        // when
        const { status } = await fetch(url, { headers: requestHeaders });

        // then
        expect(status).toBe(404);
    });

    test.concurrent('Kein AppProfile zu falscher ID', async () => {
        // given
        const url = `${restURL}/${idFalsch}`;
        const requestHeaders = new Headers();
        requestHeaders.append('Accept', 'application/json');

        // when
        const { status } = await fetch(url, { headers: requestHeaders });

        // then
        expect(status).toBe(404);
    });

    test.concurrent.each(idsETag)(
        `AppProfile zu ID %s mit ${IF_NONE_MATCH}`,
        async (id) => {
            // given
            const url = `${restURL}/${id}`;
            const headers = new Headers();
            headers.append('Accept', 'application/json');
            headers.append(IF_NONE_MATCH, '"1"');

            // when
            const response = await fetch(url, { headers });
            const { status } = response;

            // then
            expect(status).toBe(304);

            const body = await response.text();

            expect(body).toBe('');
        },
    );
});

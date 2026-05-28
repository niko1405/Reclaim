import { describe, expect, test } from 'vitest';
import { CONTENT_TYPE, restURL } from '../constants.mts';

const ids = [
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
];
const idNichtVorhanden = '550e8400-e29b-41d4-a716-446655449999';

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
});

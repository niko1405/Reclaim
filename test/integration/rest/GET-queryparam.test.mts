import { describe, expect, test } from 'vitest';
import { type Page } from '../../../src/reclaim/router/page.mts';
import { CONTENT_TYPE, restURL } from '../constants.mts';

type AppProfileType = {
    id: string;
    displayName: string;
};

describe('GET /rest', () => {
    test.concurrent('Alle AppProfiles', async () => {
        // given
        const requestHeaders = new Headers();
        requestHeaders.append('Accept', 'application/json');

        // when
        const response = await fetch(restURL, { headers: requestHeaders });
        const { status, headers } = response;

        // then
        expect(status).toBe(200);
        expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

        const body = (await response.json()) as Page<AppProfileType>;

        body.content
            .map((appProfile) => appProfile.id)
            .forEach((id) => {
                expect(id).toBeDefined();
            });
    });
});

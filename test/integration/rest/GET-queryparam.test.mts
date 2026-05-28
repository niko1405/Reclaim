import { describe, expect, test } from 'vitest';
import { type Page } from '../../../src/reclaim/router/page.mts';
import { CONTENT_TYPE, restURL } from '../constants.mts';

type AppProfileType = {
    id: string;
    displayName: string;
    timezone: string;
    currentStreak: number;
    longestStreak: number;
};
const displayNames = ['max', 'tech', 'dev'];
const displayNamesNichtVorhanden = ['xxx', 'yyy', 'zzz'];
const timezones = ['Europe/Berlin', 'Europe/Paris', 'Asia/Makassar'];
const timezonesNichtVorhanden = ['America/New_York', 'Australia/Sydney'];
const currentStreakMin = [3, 5];
const currentStreakMinNichtVorhanden = [100, 200];
const longestStreakMax = [10, 20];
const longestStreakMaxNichtVorhanden = [-1];

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

    test.concurrent.each(displayNames)(
        'AppProfiles mit Teil-DisplayName %s suchen',
        async (displayName) => {
            // given
            const params = new URLSearchParams({ displayName });
            const url = `${restURL}?${params}`;
            const requestHeaders = new Headers();
            requestHeaders.append('Accept', 'application/json');

            // when
            const response = await fetch(url, { headers: requestHeaders });
            const { status, headers } = response;

            // then
            expect(status).toBe(200);
            expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

            const body = (await response.json()) as Page<AppProfileType>;

            expect(body).toBeDefined();

            body.content
                .map((appProfile) => appProfile.displayName)
                .forEach((name) =>
                    expect(name.toLowerCase()).toStrictEqual(
                        expect.stringContaining(displayName),
                    ),
                );
        },
    );

    test.concurrent.each(displayNamesNichtVorhanden)(
        'AppProfiles zu nicht vorhandenem DisplayName %s suchen',
        async (displayName) => {
            // given
            const params = new URLSearchParams({ displayName });
            const url = `${restURL}?${params}`;
            const requestHeaders = new Headers();
            requestHeaders.append('Accept', 'application/json');

            // when
            const { status } = await fetch(url, { headers: requestHeaders });

            // then
            expect(status).toBe(404);
        },
    );

    test.concurrent.each(timezones)(
        'AppProfiles mit Timezone %s suchen',
        async (timezone) => {
            // given
            const params = new URLSearchParams({ timezone });
            const url = `${restURL}?${params}`;
            const requestHeaders = new Headers();
            requestHeaders.append('Accept', 'application/json');

            // when
            const response = await fetch(url, { headers: requestHeaders });
            const { status, headers } = response;

            // then
            expect(status).toBe(200);
            expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

            const body = (await response.json()) as Page<AppProfileType>;

            expect(body).toBeDefined();

            body.content
                .map((appProfile) => appProfile.timezone)
                .forEach((timezoneFound) => {
                    expect(timezoneFound).toBe(timezone);
                });
        },
    );

    test.concurrent.each(timezonesNichtVorhanden)(
        'AppProfiles zu nicht vorhandener Timezone %s suchen',
        async (timezone) => {
            // given
            const params = new URLSearchParams({ timezone });
            const url = `${restURL}?${params}`;
            const requestHeaders = new Headers();
            requestHeaders.append('Accept', 'application/json');

            // when
            const { status } = await fetch(url, { headers: requestHeaders });

            // then
            expect(status).toBe(404);
        },
    );

    test.concurrent.each(currentStreakMin)(
        'AppProfiles mit Mindest-CurrentStreak %i suchen',
        async (currentStreak) => {
            // given
            const params = new URLSearchParams({
                currentStreak: currentStreak.toString(),
            });
            const url = `${restURL}?${params}`;
            const requestHeaders = new Headers();
            requestHeaders.append('Accept', 'application/json');

            // when
            const response = await fetch(url, { headers: requestHeaders });
            const { status, headers } = response;

            // then
            expect(status).toBe(200);
            expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

            const body = (await response.json()) as Page<AppProfileType>;

            body.content
                .map((appProfile) => appProfile.currentStreak)
                .forEach((streak) =>
                    expect(streak).toBeGreaterThanOrEqual(currentStreak),
                );
        },
    );

    test.concurrent.each(currentStreakMinNichtVorhanden)(
        'Keine AppProfiles mit Mindest-CurrentStreak %i suchen',
        async (currentStreak) => {
            // given
            const params = new URLSearchParams({
                currentStreak: currentStreak.toString(),
            });
            const url = `${restURL}?${params}`;
            const requestHeaders = new Headers();
            requestHeaders.append('Accept', 'application/json');

            // when
            const { status } = await fetch(url, { headers: requestHeaders });

            // then
            expect(status).toBe(404);
        },
    );

    test.concurrent.each(longestStreakMax)(
        'AppProfiles mit Maximal-LongestStreak %i suchen',
        async (longestStreak) => {
            // given
            const params = new URLSearchParams({
                longestStreak: longestStreak.toString(),
            });
            const url = `${restURL}?${params}`;
            const requestHeaders = new Headers();
            requestHeaders.append('Accept', 'application/json');

            // when
            const response = await fetch(url, { headers: requestHeaders });
            const { status, headers } = response;

            // then
            expect(status).toBe(200);
            expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

            const body = (await response.json()) as Page<AppProfileType>;

            body.content
                .map((appProfile) => appProfile.longestStreak)
                .forEach((streak) =>
                    expect(streak).toBeLessThanOrEqual(longestStreak),
                );
        },
    );

    test.concurrent.each(longestStreakMaxNichtVorhanden)(
        'Keine AppProfiles mit Maximal-LongestStreak %i suchen',
        async (longestStreak) => {
            // given
            const params = new URLSearchParams({
                longestStreak: longestStreak.toString(),
            });
            const url = `${restURL}?${params}`;
            const requestHeaders = new Headers();
            requestHeaders.append('Accept', 'application/json');

            // when
            const { status } = await fetch(url, { headers: requestHeaders });

            // then
            expect(status).toBe(404);
        },
    );
});

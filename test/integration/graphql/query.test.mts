import { beforeAll, describe, expect, test } from 'vitest';
import {
    ACCEPT,
    APPLICATION_JSON,
    CONTENT_TYPE,
    GRAPHQL_RESPONSE_JSON,
    POST,
    graphqlURL,
} from '../constants.mts';
import { type GraphQLQuery } from './graphql.mts';

type AppProfileDTO = {
    id?: string;
    version: number;
    displayName: string;
    avatarUrl: string | null;
    statusMessage: string | null;
    timezone: string;
    currentStreak: number;
    onboardingCompleted: boolean;
};

type AppProfileSuccessType = {
    data: { appProfile: AppProfileDTO };
    errors?: undefined;
};

type AppProfilesSuccessType = {
    data: { appProfiles: AppProfileDTO[] };
    errors?: undefined;
};

type AppProfileErrorsType = {
    data: { appProfile: null } | null;
    errors: ErrorsType;
};

type AppProfilesErrorsType = {
    data: { appProfiles: null } | null;
    errors: ErrorsType;
};

export type ErrorsType = {
    message: string;
    path: string[];
    extensions: { code: string };
}[];

const ids = [
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
];
const idNichtVorhanden = '550e8400-e29b-41d4-a716-446655449999';
const displayNames = ['max', 'tech', 'dev'];
const displayNamesNichtVorhanden = ['xxx', 'yyy', 'zzz'];
const timezones = ['Europe/Berlin', 'Europe/Paris', 'Asia/Makassar'];
const timezonesNichtVorhanden = ['America/New_York', 'Australia/Sydney'];
const currentStreakMin = [3, 5];
const currentStreakMinNichtVorhanden = [100, 200];
const onboardingCompletedValues = [true, false];

describe('GraphQL Queries', () => {
    let headers: Headers;

    beforeAll(() => {
        headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);
    });

    test.concurrent.each(ids)('AppProfile zu ID %s', async (id) => {
        // given
        const query: GraphQLQuery = {
            query: `
                {
                    appProfile(id: "${id}") {
                        version
                        displayName
                        avatarUrl
                        statusMessage
                        timezone
                        currentStreak
                        onboardingCompleted
                    }
                }
            `,
        };

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(query),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(200);
        expect(response.headers.get(CONTENT_TYPE)).toMatch(
            /application\/graphql-response\+json/iu,
        );

        const { data, errors } =
            (await response.json()) as AppProfileSuccessType;

        expect(errors).toBeUndefined();
        expect(data).toBeDefined();

        const { appProfile } = data;

        expect(appProfile.displayName).toMatch(/^\w/u);
        expect(appProfile.version).toBeGreaterThan(-1);
        expect(appProfile.id).toBeUndefined();
    });

    test.concurrent('AppProfile zu nicht-vorhandener ID', async () => {
        // given
        const query: GraphQLQuery = {
            query: `
            {
                appProfile(id: "${idNichtVorhanden}") {
                    version
                    displayName
                    avatarUrl
                    statusMessage
                    timezone
                    currentStreak
                    onboardingCompleted
                }
            }
        `,
        };

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(query),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(200);
        expect(response.headers.get(CONTENT_TYPE)).toMatch(
            /application\/graphql-response\+json/iu,
        );

        const { data, errors } =
            (await response.json()) as AppProfileErrorsType;

        expect(data).toBeNull();

        expect(errors).toBeDefined();
        expect(errors[0]?.message).toMatch(
            new RegExp(`kein AppProfile mit der ID ${idNichtVorhanden}`, 'iu'),
        );
    });

    test.concurrent.each(displayNames)(
        'AppProfiles mit Teil-DisplayName %s suchen',
        async (displayName) => {
            // given
            const query: GraphQLQuery = {
                query: `
                {
                    appProfiles(input: { displayName: "${displayName}" }) {
                        version
                        displayName
                        avatarUrl
                        statusMessage
                        timezone
                        currentStreak
                        onboardingCompleted
                    }
                }
            `,
            };

            // when
            const response = await fetch(graphqlURL, {
                method: POST,
                body: JSON.stringify(query),
                headers,
            });

            // then
            const { status } = response;

            expect(status).toBe(200);
            expect(response.headers.get(CONTENT_TYPE)).toMatch(
                /application\/graphql-response\+json/iu,
            );

            const { data, errors } =
                (await response.json()) as AppProfilesSuccessType;

            expect(errors).toBeUndefined();
            expect(data).toBeDefined();

            const { appProfiles } = data;

            expect(appProfiles).toBeDefined();
            expect(appProfiles.length).toBeGreaterThan(0);

            appProfiles
                .map((appProfile: AppProfileDTO) => appProfile.displayName)
                .forEach((name: string) =>
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
            const query: GraphQLQuery = {
                query: `
                {
                    appProfiles(input: { displayName: "${displayName}" }) {
                        version
                        displayName
                        avatarUrl
                        statusMessage
                        timezone
                        currentStreak
                        onboardingCompleted
                    }
                }
            `,
            };

            // when
            const response = await fetch(graphqlURL, {
                method: POST,
                body: JSON.stringify(query),
                headers,
            });

            // then
            const { status } = response;

            expect(status).toBe(200);
            expect(response.headers.get(CONTENT_TYPE)).toMatch(
                /application\/graphql-response\+json/iu,
            );

            const { data, errors } =
                (await response.json()) as AppProfilesErrorsType;

            expect(data).toBeNull();

            expect(errors).toBeDefined();
            expect(errors[0]?.message).toMatch(/No AppProfiles found/iu);
        },
    );

    test.concurrent.each(timezones)(
        'AppProfiles mit Timezone %s suchen',
        async (timezoneExpected) => {
            // given
            const query: GraphQLQuery = {
                query: `
                {
                    appProfiles(input: { timezone: "${timezoneExpected}" }) {
                        displayName
                        timezone
                    }
                }
            `,
            };

            // when
            const response = await fetch(graphqlURL, {
                method: POST,
                body: JSON.stringify(query),
                headers,
            });

            // then
            const { status } = response;

            expect(status).toBe(200);
            expect(response.headers.get(CONTENT_TYPE)).toMatch(
                /application\/graphql-response\+json/iu,
            );

            const { data, errors } =
                (await response.json()) as AppProfilesSuccessType;

            expect(errors).toBeUndefined();
            expect(data).toBeDefined();

            const { appProfiles } = data;

            expect(appProfiles).not.toHaveLength(0);

            appProfiles.forEach((appProfile: AppProfileDTO) => {
                const { timezone, displayName } = appProfile;

                expect(timezone).toBe(timezoneExpected);
                expect(displayName).toBeDefined();
            });
        },
    );

    test.concurrent.each(timezonesNichtVorhanden)(
        'AppProfiles zu nicht vorhandener Timezone %s suchen',
        async (timezone) => {
            // given
            const query: GraphQLQuery = {
                query: `
                {
                    appProfiles(input: { timezone: "${timezone}" }) {
                        displayName
                        timezone
                    }
                }
            `,
            };

            // when
            const response = await fetch(graphqlURL, {
                method: POST,
                body: JSON.stringify(query),
                headers,
            });

            // then
            const { status } = response;

            expect(status).toBe(200);
            expect(response.headers.get(CONTENT_TYPE)).toMatch(
                /application\/graphql-response\+json/iu,
            );

            const { data, errors } =
                (await response.json()) as AppProfilesErrorsType;

            expect(data).toBeNull();

            expect(errors).toBeDefined();
            expect(errors[0]?.message).toMatch(/No AppProfiles found/iu);
        },
    );

    test.concurrent.each(currentStreakMin)(
        'AppProfiles mit Mindest-CurrentStreak %i suchen',
        async (currentStreak) => {
            // given
            const query: GraphQLQuery = {
                query: `
                {
                    appProfiles(input: { currentStreak: ${currentStreak} }) {
                        displayName
                        currentStreak
                    }
                }
            `,
            };

            // when
            const response = await fetch(graphqlURL, {
                method: POST,
                body: JSON.stringify(query),
                headers,
            });

            // then
            const { status } = response;

            expect(status).toBe(200);
            expect(response.headers.get(CONTENT_TYPE)).toMatch(
                /application\/graphql-response\+json/iu,
            );

            const { data, errors } =
                (await response.json()) as AppProfilesSuccessType;

            expect(errors).toBeUndefined();
            expect(data).toBeDefined();

            const { appProfiles } = data;

            expect(appProfiles).not.toHaveLength(0);

            appProfiles.forEach((appProfile: AppProfileDTO) => {
                const { currentStreak: currentStreakFound, displayName } =
                    appProfile;

                expect(currentStreakFound).toBeGreaterThanOrEqual(
                    currentStreak,
                );
                expect(displayName).toBeDefined();
            });
        },
    );

    test.concurrent.each(currentStreakMinNichtVorhanden)(
        'Keine AppProfiles mit Mindest-CurrentStreak %i suchen',
        async (currentStreak) => {
            // given
            const query: GraphQLQuery = {
                query: `
                {
                    appProfiles(input: { currentStreak: ${currentStreak} }) {
                        displayName
                        currentStreak
                    }
                }
            `,
            };

            // when
            const response = await fetch(graphqlURL, {
                method: POST,
                body: JSON.stringify(query),
                headers,
            });

            // then
            const { status } = response;

            expect(status).toBe(200);
            expect(response.headers.get(CONTENT_TYPE)).toMatch(
                /application\/graphql-response\+json/iu,
            );

            const { data, errors } =
                (await response.json()) as AppProfilesErrorsType;

            expect(data).toBeNull();

            expect(errors).toBeDefined();
            expect(errors[0]?.message).toMatch(/No AppProfiles found/iu);
        },
    );

    test.concurrent.each(onboardingCompletedValues)(
        'AppProfiles mit onBoardingCompleted=%s suchen',
        async (onBoardingCompleted) => {
            // given
            const query: GraphQLQuery = {
                query: `
                {
                    appProfiles(input: { onBoardingCompleted: ${onBoardingCompleted} }) {
                        displayName
                        onboardingCompleted
                    }
                }
            `,
            };

            // when
            const response = await fetch(graphqlURL, {
                method: POST,
                body: JSON.stringify(query),
                headers,
            });

            // then
            const { status } = response;

            expect(status).toBe(200);
            expect(response.headers.get(CONTENT_TYPE)).toMatch(
                /application\/graphql-response\+json/iu,
            );

            const { data, errors } =
                (await response.json()) as AppProfilesSuccessType;

            expect(errors).toBeUndefined();
            expect(data).toBeDefined();

            const { appProfiles } = data;

            expect(appProfiles).not.toHaveLength(0);

            appProfiles.forEach((appProfile: AppProfileDTO) => {
                const {
                    onboardingCompleted: onboardingCompletedFound,
                    displayName,
                } = appProfile;

                expect(onboardingCompletedFound).toBe(onBoardingCompleted);
                expect(displayName).toBeDefined();
            });
        },
    );
});

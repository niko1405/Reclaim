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
});

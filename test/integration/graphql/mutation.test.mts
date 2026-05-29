import { beforeAll, describe, expect, test } from 'vitest';
import {
    ACCEPT,
    APPLICATION_JSON,
    AUTHORIZATION,
    BEARER,
    CONTENT_TYPE,
    GRAPHQL_RESPONSE_JSON,
    POST,
    graphqlURL,
} from '../constants.mts';
import { type GraphQLQuery } from './graphql.mts';
import { type ErrorsType } from './query.test.mts';
import { getToken } from './token.mts';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------

const uuidRegexp =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

type CreateSuccessType = {
    data: { create: { id: string } };
    errors?: undefined;
};
type CreateErrorsType = { data: null; errors: ErrorsType };

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
describe('GraphQL Mutations', () => {
    let token: string;
    let tokenUser: string;

    beforeAll(async () => {
        token = await getToken('admin', 'p');
        tokenUser = await getToken('user', 'p');
    });

    // -------------------------------------------------------------------------
    test('Neues AppProfile', async () => {
        // given
        const mutation: GraphQLQuery = {
            query: `
                mutation {
                    create(
                        input: {
                            displayName: "Create Mutation User",
                            avatarUrl: "https://example.com/avatar/create-mutation.png",
                            statusMessage: "Created by GraphQL mutation test",
                            timezone: "Europe/Berlin",
                            currentStreak: 1,
                            onboardingCompleted: true
                        }
                    ) {
                        id
                    }
                }
            `,
        };
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(mutation),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(200);
        expect(response.headers.get(CONTENT_TYPE)).toMatch(
            /application\/graphql-response\+json/iu,
        );

        const { data, errors } = (await response.json()) as CreateSuccessType;

        expect(errors).toBeUndefined();
        expect(data).toBeDefined();

        const { create } = data;

        // Der Wert der Mutation ist die generierte UUID
        expect(create).toBeDefined();

        const { id } = create;

        expect(id).toMatch(uuidRegexp);
    });

    // -------------------------------------------------------------------------
    test('AppProfile mit ungueltigen Werten neu anlegen', async () => {
        // given
        const mutation: GraphQLQuery = {
            query: `
                mutation {
                    create(
                        input: {
                            displayName: "",
                            avatarUrl: "ungueltige-url",
                            statusMessage: "${'x'.repeat(241)}",
                            timezone: "ungueltige-zeitzone",
                            currentStreak: -1,
                            onboardingCompleted: false,
                            trackingConfig: {
                                dailyLimitMinutes: -1,
                                isPublic: true,
                                notificationsEnabled: true
                            },
                            screentimeLogs: [{
                                logDate: "2026-01-01T00:00:00Z",
                                totalMinutes: -1,
                                topApp: "${'x'.repeat(121)}"
                            }]
                        }
                    ) {
                        id
                    }
                }
            `,
        };
        const expectedPaths = [
            'displayName',
            'avatarUrl',
            'statusMessage',
            'timezone',
            'currentStreak',
            'trackingConfig',
            'screentimeLogs',
        ];
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(graphqlURL, {
            method: POST,
            body: JSON.stringify(mutation),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(200);
        expect(response.headers.get(CONTENT_TYPE)).toMatch(
            /application\/graphql-response\+json/iu,
        );

        const { data, errors } = (await response.json()) as CreateErrorsType;

        expect(data).toBeNull();
        expect(errors).toHaveLength(1);

        const [error] = errors;

        expect(error).toBeDefined();

        const { message } = error!;
        const messageArray: any[] = JSON.parse(message);

        expect(messageArray).toBeDefined();
        expect(messageArray.length).toBeGreaterThanOrEqual(
            expectedPaths.length,
        );

        const paths = messageArray.map((msg) => msg.path[0]);

        expect(paths).toStrictEqual(expect.arrayContaining(expectedPaths));
    });
});

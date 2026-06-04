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
const idVorhanden = '550e8400-e29b-41d4-a716-446655440002';
const idNichtVorhanden = '550e8400-e29b-41d4-a716-446655449999';

const uuidRegexp =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

type CreateSuccessType = {
    data: { create: { id: string } };
    errors?: undefined;
};
type CreateErrorsType = { data: null; errors: ErrorsType };

type UpdateSuccessType = {
    data: { update: { version: number } };
    errors?: undefined;
};
type UpdateErrorsType = {
    data: { update: null } | null;
    errors: ErrorsType;
};

type DeleteSuccessType = {
    data: { delete: { success: boolean } };
    errors?: undefined;
};
type DeleteErrorsType = {
    data: { delete: null } | null;
    errors: ErrorsType;
};

const createAppProfile = async (token: string) => {
    const mutation: GraphQLQuery = {
        query: `
            mutation {
                create(
                    input: {
                        displayName: "Delete Mutation User",
                        avatarUrl: "https://example.com/avatar/delete-mutation.png",
                        statusMessage: "Created for delete mutation test",
                        timezone: "Europe/Berlin",
                        currentStreak: 0,
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

    const response = await fetch(graphqlURL, {
        method: POST,
        body: JSON.stringify(mutation),
        headers,
    });
    const { data } = (await response.json()) as CreateSuccessType;
    return data.create.id;
};

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

        const message = error?.message;

        expect(message).toBeDefined();

        // Lösung: Wenn message undefined ist, übergeben wir einen validen JSON-String '[]',
        // damit parse() nicht abstürzt. Das nachfolgende expect fängt das dann logisch ab.
        const messageArray: any[] = JSON.parse(message ?? '[]');

        expect(messageArray).toBeDefined();
        expect(messageArray.length).toBeGreaterThanOrEqual(
            expectedPaths.length,
        );

        const paths = messageArray.map((msg) => msg.path[0]);

        expect(paths).toStrictEqual(expect.arrayContaining(expectedPaths));
    });

    // -------------------------------------------------------------------------
    test('AppProfile aktualisieren', async () => {
        // given
        const mutation: GraphQLQuery = {
            query: `
                mutation {
                    update(
                        input: {
                            id: "${idVorhanden}",
                            version: 0,
                            displayName: "Update Mutation User",
                            avatarUrl: "https://example.com/avatar/update-mutation.png",
                            statusMessage: "Updated by GraphQL mutation test",
                            timezone: "Europe/Berlin",
                            currentStreak: 7,
                            onboardingCompleted: true
                        }
                    ) {
                        version
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

        const { data, errors } = (await response.json()) as UpdateSuccessType;

        expect(errors).toBeUndefined();

        const { update } = data;

        // Der Wert der Mutation ist die neue Versionsnummer
        expect(update.version).toBe(1);
    });

    // -------------------------------------------------------------------------
    test('AppProfile mit ungueltigen Werten aktualisieren', async () => {
        // given
        const mutation: GraphQLQuery = {
            query: `
                mutation {
                    update(
                        input: {
                            id: "${idVorhanden}",
                            version: 0,
                            displayName: "",
                            avatarUrl: "ungueltige-url",
                            statusMessage: "${'x'.repeat(241)}",
                            timezone: "ungueltige-zeitzone",
                            currentStreak: -1,
                            onboardingCompleted: true
                        }
                    ) {
                        version
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

        const { data, errors } = (await response.json()) as UpdateErrorsType;

        expect(data?.update).toBeNull();
        expect(errors).toHaveLength(1);

        const [error] = errors;

        // Fix: Nutzung von optionaler Verkettung statt Non-Null-Assertion
        const message = error?.message;

        expect(message).toBeDefined();

        const messageArray: any[] = JSON.parse(message ?? '[]');

        expect(messageArray).toBeDefined();
        expect(messageArray).toHaveLength(expectedPaths.length);

        const paths = messageArray.map((msg) => msg.path[0]);

        expect(paths).toStrictEqual(expect.arrayContaining(expectedPaths));
    });

    // -------------------------------------------------------------------------
    test('Nicht-vorhandenes AppProfile aktualisieren', async () => {
        // given
        const mutation: GraphQLQuery = {
            query: `
                mutation {
                    update(
                        input: {
                            id: "${idNichtVorhanden}",
                            version: 0,
                            displayName: "Update Mutation User",
                            avatarUrl: "https://example.com/avatar/update-mutation.png",
                            statusMessage: "Updated by GraphQL mutation test",
                            timezone: "Europe/Berlin",
                            currentStreak: 7,
                            onboardingCompleted: true
                        }
                    ) {
                        version
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

        const { data, errors } = (await response.json()) as UpdateErrorsType;

        expect(data?.update).toBeNull();
        expect(errors).toHaveLength(1);

        const [error] = errors;

        expect(error).toBeDefined();

        // Fix: Destrukturierung mit Standardwerten absichern, falls error doch undefined ist
        const { message, path, extensions } = error ?? {};

        expect(message).toBe(
            `Es gibt kein AppProfile mit der ID ${idNichtVorhanden}.`,
        );
        expect(path).toBeDefined();
        expect(path?.[0]).toBe('update');
        expect(extensions).toBeDefined();
        expect(extensions?.code).toBe('BAD_USER_INPUT');
    });

    // -------------------------------------------------------------------------
    test('AppProfile loeschen', async () => {
        // given
        const idLoeschen = await createAppProfile(token);
        const mutation: GraphQLQuery = {
            query: `
                mutation {
                    delete(id: "${idLoeschen}") {
                        success
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

        const { data, errors } = (await response.json()) as DeleteSuccessType;

        expect(errors).toBeUndefined();
        // Der Wert der Mutation ist true (falls geloescht wurde) oder false
        expect(data.delete.success).toBe(true);
    });

    // -------------------------------------------------------------------------
    test('AppProfile loeschen als "user"', async () => {
        // given
        const idLoeschen = await createAppProfile(token);
        const mutation: GraphQLQuery = {
            query: `
                mutation {
                    delete(id: "${idLoeschen}") {
                        success
                    }
                }
            `,
        };
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(ACCEPT, GRAPHQL_RESPONSE_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${tokenUser}`);

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

        const { data, errors } = (await response.json()) as DeleteErrorsType;

        expect(data?.delete).toBeNull();

        const [error] = errors;

        expect(error).toBeDefined();

        // Fix: Optional Chaining nutzen
        const extensions = error?.extensions;

        expect(extensions?.code).toBe('FORBIDDEN');
    });
});

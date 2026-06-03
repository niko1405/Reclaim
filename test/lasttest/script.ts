// Copyright (C) 2024 - present Juergen Zimmermann, Hochschule Karlsruhe
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

import http from 'k6/http';
// @ts-expect-error https://github.com/grafana/k6-jslib-testing
import { expect } from 'https://jslib.k6.io/k6-testing/0.6.1/index.js';
import { sleep } from 'k6';
import { type Options } from 'k6/options';

const baseUrl = 'https://localhost:3000';
const restUrl = `${baseUrl}/rest/appprofile`;
const graphqlUrl = `${baseUrl}/graphql`;
const tokenUrl = `${baseUrl}/auth/token`;
const dbPopulateUrl = `${baseUrl}/dev/db_populate`;

// AppProfile IDs aus der CSV-Datei (Mockdaten)
const profileIds = [
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440003',
    '550e8400-e29b-41d4-a716-446655440004',
    '550e8400-e29b-41d4-a716-446655440005',
];

// Suchparameter für AppProfiles (aus CSV-Daten)
const displayNames = [
    'Max Power',
    'Lina Tech',
    'Digital Nomad',
    'Karlsruhe Dev',
    'Focus Queen',
];
const timezones = ['Europe/Berlin', 'Europe/Paris', 'Asia/Makassar'];
const displayNamesNotFound = [
    'Nicht Vorhanden 1',
    'Nicht Vorhanden 2',
    'Nicht Vorhanden 3',
];

// Template für ein neues AppProfile
const newAppProfile = {
    displayName: 'k6-Loadtest-Profile',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=k6',
    statusMessage: 'Lastest mit k6',
    timezone: 'Europe/Berlin',
    currentStreak: 0,
    onboardingCompleted: true,
    trackingConfig: {
        dailyLimitMinutes: 120,
        isPublic: true,
        notificationsEnabled: true,
    },
};

const tlsDir = '../../src/config/resources/tls';
const cert = open(`${tlsDir}/certificate.crt`);
const key = open(`${tlsDir}/key.pem`);

// https://grafana.com/docs/k6/latest/test-lifecycle
export function setup() {
    const tokenHeaders: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
    };

    const body = 'username=admin&password=p';
    const tokenResponse = http.post<'text'>(tokenUrl, body, {
        headers: tokenHeaders,
    });
    let token: string;
    if (tokenResponse.status === 200) {
        token = JSON.parse(tokenResponse.body).access_token;
        console.log(`token=${token}`);
    } else {
        throw new Error(
            `setup fuer adminToken: status=${tokenResponse.status}, body=${tokenResponse.body}`,
        );
    }

    const headers = { Authorization: `Bearer ${token}` };
    const res = http.post(dbPopulateUrl, undefined, { headers });
    if (res.status === 200) {
        console.log('DB neu geladen');
    } else {
        throw new Error(
            `setup fuer db_populate: status=${res.status}, body=${res.body}`,
        );
    }
}

const rampUpDuration = '5s';
const steadyDuration = '22s';
const rampDownDuration = '3s';

export const options: Options = {
    batchPerHost: 50,
    // httpDebug: 'headers',

    scenarios: {
        // GET /rest/appprofile/<id> - einzelnes Profil laden
        get_profile_by_id: {
            exec: 'getProfileById',
            executor: 'ramping-vus',
            stages: [
                { target: 3, duration: rampUpDuration },
                { target: 3, duration: steadyDuration },
                { target: 0, duration: rampDownDuration },
            ],
        },
        // GET /rest/appprofile/<id> mit If-None-Match (304 Not Modified)
        get_profile_not_modified: {
            exec: 'getProfileByIdNotModified',
            executor: 'ramping-vus',
            stages: [
                { target: 5, duration: rampUpDuration },
                { target: 5, duration: steadyDuration },
                { target: 0, duration: rampDownDuration },
            ],
        },
        // GET /rest/appprofile?displayName=<value>
        get_by_display_name: {
            exec: 'getByDisplayName',
            executor: 'ramping-vus',
            stages: [
                { target: 4, duration: rampUpDuration },
                { target: 4, duration: '22s' },
                { target: 0, duration: rampDownDuration },
            ],
        },
        // GET /rest/appprofile?timezone=<value>
        get_by_timezone: {
            exec: 'getByTimezone',
            executor: 'ramping-vus',
            stages: [
                { target: 3, duration: rampUpDuration },
                { target: 3, duration: '22s' },
                { target: 0, duration: rampDownDuration },
            ],
        },
        // GET /rest/appprofile mit Paginierung
        get_all_paginated: {
            exec: 'getAllPaginated',
            executor: 'ramping-vus',
            stages: [
                { target: 5, duration: rampUpDuration },
                { target: 5, duration: '22s' },
                { target: 0, duration: rampDownDuration },
            ],
        },
        // POST /rest/appprofile - neues Profil erstellen
        post_profile: {
            exec: 'postProfile',
            executor: 'ramping-vus',
            stages: [
                { target: 2, duration: rampUpDuration },
                { target: 2, duration: '22s' },
                { target: 0, duration: rampDownDuration },
            ],
        },
        // GraphQL query "appProfile"
        query_app_profile: {
            exec: 'queryAppProfile',
            executor: 'ramping-vus',
            stages: [
                { target: 3, duration: rampUpDuration },
                { target: 3, duration: '22s' },
                { target: 0, duration: rampDownDuration },
            ],
        },
        // GraphQL query "appProfiles"
        query_app_profiles: {
            exec: 'queryAppProfiles',
            executor: 'ramping-vus',
            stages: [
                { target: 4, duration: rampUpDuration },
                { target: 4, duration: '22s' },
                { target: 0, duration: rampDownDuration },
            ],
        },
        // GET /rest/appprofile?displayName=<nicht_vorhanden> -> 404
        get_display_name_not_found: {
            exec: 'getByDisplayNameNotFound',
            executor: 'ramping-vus',
            stages: [
                { target: 2, duration: rampUpDuration },
                { target: 2, duration: '22s' },
                { target: 0, duration: rampDownDuration },
            ],
        },
    },

    // https://grafana.com/docs/k6/latest/using-k6/protocols/ssl-tls/ssl-tls-client-certificates
    tlsAuth: [
        {
            cert,
            key,
        },
    ],
    tlsVersion: http.TLS_1_3, // DevSkim: ignore DS440000
    insecureSkipTLSVerify: true,
};

// ============================================================================
// HTTP-Requests mit Überprüfungen
// ============================================================================

// GET /rest/appprofile/<id>
export function getProfileById() {
    const id = profileIds[Math.floor(Math.random() * profileIds.length)];
    const response = http.get(`${restUrl}/${id}`);

    const { status, headers } = response;
    expect(status).toBe(200);
    expect(headers['Content-Type']).toContain('application/json');
    sleep(1); // Denkzeit simulieren
}

// GET /rest/appprofile/<id> mit If-None-Match
export function getProfileByIdNotModified() {
    const id = profileIds[Math.floor(Math.random() * profileIds.length)];
    const headers: Record<string, string> = {
        'If-None-Match': '"0"',
    };
    const response = http.get(`${restUrl}/${id}`, { headers });

    expect(response.status).toBe(304);
    sleep(1);
}

// GET /rest/appprofile?displayName=<value>
export function getByDisplayName() {
    const displayName =
        displayNames[Math.floor(Math.random() * displayNames.length)];
    const response = http.get(`${restUrl}?displayName=${displayName}`);

    const { status, headers } = response;
    expect(status).toBe(200);
    expect(headers['Content-Type']).toContain('application/json');
    sleep(1);
}

// 404 GET /rest/appprofile?displayName=<nicht_vorhanden>
export function getByDisplayNameNotFound() {
    const displayName =
        displayNamesNotFound[
            Math.floor(Math.random() * displayNamesNotFound.length)
        ];
    const response = http.get(`${restUrl}?displayName=${displayName}`);

    expect(response.status).toBe(404);
    sleep(1);
}

// GET /rest/appprofile?timezone=<value>
export function getByTimezone() {
    const timezone = timezones[Math.floor(Math.random() * timezones.length)];
    const response = http.get(`${restUrl}?timezone=${timezone}`);

    const { status, headers } = response;
    expect(status).toBe(200);
    expect(headers['Content-Type']).toContain('application/json');
    sleep(1);
}

// GET /rest/appprofile?page=0&size=2
export function getAllPaginated() {
    const page = Math.floor(Math.random() * 3); // Seite 0-2
    const response = http.get(`${restUrl}?page=${page}&size=2`);

    const { status, headers } = response;
    expect(status).toBe(200);
    expect(headers['Content-Type']).toContain('application/json');
    sleep(1);
}

// POST /rest/appprofile
export function postProfile() {
    const profile = { ...newAppProfile };
    // Eindeutigen Namen für jedes Profil generieren
    profile.displayName = `k6-Profile-${Math.random().toString(36).substr(2, 9)}`;

    const tokenHeaders: Record<string, string> = {
        'Content-Type': 'application/x-www-form-urlencoded',
    };
    const body = 'username=admin&password=p';
    const tokenResponse = http.post<'text'>(tokenUrl, body, {
        headers: tokenHeaders,
    });
    expect(tokenResponse.status).toBe(200);
    const token = JSON.parse(tokenResponse.body).access_token;

    const requestHeaders = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
    const response = http.post(restUrl, JSON.stringify(profile), {
        headers: requestHeaders,
    });

    const { status, headers } = response;
    expect(status).toBe(201);
    expect(headers['Location']).toContain(restUrl);
    sleep(1);
}

// POST /graphql query "appProfile"
export function queryAppProfile() {
    const id = profileIds[Math.floor(Math.random() * profileIds.length)];
    const body = {
        query: `
            {
                appProfile(id: "${id}") {
                    id
                    version
                    displayName
                    statusMessage
                    timezone
                    currentStreak
                    onboardingCompleted
                    trackingConfig {
                        dailyLimitMinutes
                        isPublic
                        notificationsEnabled
                    }
                    screentimeLogs {
                        logDate
                        totalMinutes
                        topApp
                    }
                }
            }
        `,
    };
    const requestHeaders = { 'Content-Type': 'application/json' };

    const response = http.post(graphqlUrl, JSON.stringify(body), {
        headers: requestHeaders,
    });

    const { status, headers } = response;
    expect(status).toBe(200);
    expect(headers['Content-Type']).toContain('application/json');
    sleep(1);
}

// POST /graphql query "appProfiles"
export function queryAppProfiles() {
    const displayName =
        displayNames[Math.floor(Math.random() * displayNames.length)];
    const body = {
        query: `
            {
                appProfiles(input: {
                    displayName: "${displayName}"
                }) {
                    id
                    displayName
                    timezone
                    currentStreak
                    trackingConfig {
                        dailyLimitMinutes
                        isPublic
                    }
                }
            }
        `,
    };
    const requestHeaders = { 'Content-Type': 'application/json' };

    const response = http.post(graphqlUrl, JSON.stringify(body), {
        headers: requestHeaders,
    });

    const { status, headers } = response;
    expect(status).toBe(200);
    expect(headers['Content-Type']).toContain('application/json');
    sleep(1);
}

#!/usr/bin/env bun
// Copyright (C) 2024 - present, Juergen Zimmermann, Hochschule Karlsruhe
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
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

// Aufruf:   bun scripts/generate-load.mts

import { env } from 'node:process';

const SLEEP_IN_MILLIS = 50;

const sleep = (millis: number) => {
    return new Promise((resolve) => setTimeout(resolve, millis));
};

// selbst-signiertes Zertifikat ignorieren
env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

const options: RequestInit = {
    headers: {
        Accept: 'application/json',
    },
};

// Deine echten UUIDs aus den CSV-Mockdaten
const uuids = [
    '550e8400-e29b-41d4-a716-446655440001', // Max Power
    '550e8400-e29b-41d4-a716-446655440002', // Lina Tech
    '550e8400-e29b-41d4-a716-446655440003', // Digital Nomad
    '550e8400-e29b-41d4-a716-446655440004', // Karlsruhe Dev
    '550e8400-e29b-41d4-a716-446655440005', // Focus Queen
];

console.log('Starte Lastgenerator für Prometheus/Grafana...');
console.log('Drücke Strg+C zum Beenden.');
console.log('');

for (let index = 0; ; index++) {
    // Holt die UUIDs der Reihe nach (zyklisch) aus dem Array ab
    const id = uuids[index % uuids.length];

    console.log(`[Request #${index + 1}] Rufe Profil ab mit ID: ${id}`);

    // Endpunkt korrigiert auf /rest/<id>
    const url = `https://localhost:3000/rest/${id}`;

    try {
        const response = await fetch(url, options);
        if (response.status !== 200) {
            console.error(
                `❌ Fehler bei id=${id}: HTTP Status ${response.status}`,
            );
        } else {
            // Optional: Wenn du den Inhalt nicht brauchst, reicht der Status
            // Aber das Auslesen stellt sicher, dass der Stream komplett verarbeitet wird
            await response.json();
        }
    } catch (error) {
        console.error(`🚨 Netzwerkfehler beim Abruf von id=${id}:`, error);
    }

    await sleep(SLEEP_IN_MILLIS);
}

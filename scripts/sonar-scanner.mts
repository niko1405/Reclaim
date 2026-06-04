#!/usr/bin/env bun
/*
 * Copyright (C) 2023 - present Juergen Zimmermann, Hochschule Karlsruhe
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

// Aufruf:   bun .\scripts\sonar-scanner.mts

import { exec } from 'node:child_process';
import { resolve } from 'node:path';

let baseExecPath = '/home/u7411/Zimmermann';
let baseScript = 'sonar-scanner';

const script = resolve(baseExecPath, 'sonar-scanner', 'bin', baseScript);

const token = process.env['SONAR_TOKEN'];

if (!token) {
    console.error(
        '❌ Fehler: SONAR_TOKEN ist nicht in der .env-Datei definiert!',
    );
    process.exit(1);
}

// Wir hängen den Token aus der Umgebungsvariable an den Befehl an
const execCommand = `${script} -Dsonar.token=${token} -Dsonar.host.url=http://localhost:9000`;

console.log(
    `Führe Befehl aus: ${script} -Dsonar.token=******** -Dsonar.host.url=http://localhost:9000`,
);
console.log('');

exec(execCommand, (err, stdout, _) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log(stdout);
});

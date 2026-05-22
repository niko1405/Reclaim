// Copyright (C) 2021 - present Juergen Zimmermann, Hochschule Karlsruhe
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

import { Hono } from 'hono';
import { prismaClient } from '../config/prisma-client.mts';
import { getLogger } from '../logger/logger.mts';

/**
 * Das Modul besteht aus dem Router für Liveness und Readiness.
 * @packageDocumentation
 */
export const router = new Hono();

const logger = getLogger('health-router', 'file');

router.get('/liveness', (c) => {
    return c.json({ status: 'up' });
});

router.get('/readiness', async (c) => {
    try {
        // Einfache DB-Abfrage zur Readiness: SELECT 1
        // $queryRaw verwendet ein template literal, damit Prisma die Abfrage parametriert
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        await prismaClient.$queryRaw`SELECT 1`;
        return c.json({ status: 'up' });
    } catch (err) {
        // Bei Fehlern DB als nicht bereit melden
        logger.error({ err }, 'Readiness-Check fehlgeschlagen');
        c.status(503);
        return c.json({ status: 'down', error: String(err) });
    }
});

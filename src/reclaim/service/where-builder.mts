// Copyright (C) 2016 - present Juergen Zimmermann, Hochschule Karlsruhe
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

/**
 * Das Modul besteht aus der Klasse {@linkcode WhereBuilder}.
 * @packageDocumentation
 */

import { Prisma } from '../../generated/prisma/client.ts';
import { AppProfileWhereInput } from '../../generated/prisma/models.ts';
import { getLogger } from '../../logger/logger.mts';
import { type QueryParams } from './queryparams.mts';

const logger = getLogger('buildWhere', 'func');

/**
 * Building WHERE-Clause for Prisma-Query by provided query parameters.
 * @param queryparams - Query-Parameter aus der URL, z.B. `?displayName=John&currentStreak=5`
 * @returns Prisma WHERE-Input, z.B. `{ displayName: { contains: 'John', mode: 'insensitive' }, currentStreak: { gte: 5 } }`
 * @see https://www.prisam.io/docs/concepts/components/prisma-client/where-filtering
 * @see https://www.prisam.io/docs/concepts/components/prisma-client/query-filters#string-filters
 * @see https://www.prisam.io/docs/concepts/components/prisma-client/query-filters#number-filters
 * @see https://www.prisam.io/docs/concepts/components/prisma-client/query-filters#boolean-filters
 * @see https://www.prisam.io/docs/concepts/components/prisma-client/query-filters#date-filters
 */
export const buildWhere = (queryparams: QueryParams) => {
    logger.debug('build: queryparams=%o', queryparams);

    const where: AppProfileWhereInput = {};

    if (!queryparams) {
        logger.debug('build: no queryparams -> return empty where');
        return where;
    }

    const toNumber = (v: unknown): number | undefined => {
        if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
        if (typeof v === 'string') {
            const n = Number(v);
            return Number.isFinite(n) ? n : undefined;
        }
        return undefined;
    };

    const toBoolean = (v: unknown): boolean | undefined => {
        if (typeof v === 'boolean') return v;
        if (typeof v === 'string') {
            const s = v.trim().toLowerCase();
            if (s === 'true') return true;
            if (s === 'false') return false;
        }
        return undefined;
    };

    const toDate = (v: unknown): Date | undefined => {
        if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
        if (typeof v === 'string') {
            const d = new Date(v);
            if (!Number.isNaN(d.getTime())) return d;
        }
        return undefined;
    };

    const handlers: Record<keyof QueryParams, (val: unknown) => void> = {
        displayName: (val) => {
            if (typeof val === 'string' && val.length > 0) {
                where.displayName = {
                    contains: val,
                    mode: Prisma.QueryMode.insensitive,
                };
            }
        },
        avatarUrl: (val) => {
            if (typeof val === 'string' && val.length > 0) {
                where.avatarUrl = { equals: val };
            }
        },
        statusMsg: (val) => {
            if (typeof val === 'string' && val.length > 0) {
                where.statusMessage = {
                    contains: val,
                    mode: Prisma.QueryMode.insensitive,
                };
            }
        },
        timezone: (val) => {
            if (typeof val === 'string' && val.length > 0) {
                where.timezone = { equals: val };
            }
        },
        currentStreak: (val) => {
            const n = toNumber(val);
            if (n !== undefined) {
                // search for profiles with at least the given streak
                where.currentStreak = { gte: n };
            }
        },
        onBoardingCompleted: (val) => {
            const b = toBoolean(val);
            if (b !== undefined) {
                // Prisma field is `onboardingCompleted`
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore - mapping from query param name to prisma field
                where.onboardingCompleted = { equals: b };
            }
        },
        erzeugt: (val) => {
            const d = toDate(val);
            if (d) {
                where.erzeugt = { gte: d };
            }
        },
        aktualisiert: (val) => {
            const d = toDate(val);
            if (d) {
                where.aktualisiert = { gte: d };
            }
        },
    };

    // Iterate over provided params and call handler when available
    Object.entries(queryparams).forEach(([key, value]) => {
        // Type assertion: key is one of the QueryParams keys
        const handler = (handlers as Record<string, (v: unknown) => void>)[key];
        if (typeof handler === 'function') {
            handler(value);
        } else {
            logger.debug('build: unknown query param ignored: %s', key);
        }
    });

    logger.debug('build: where=%o', where);
    return where;
};

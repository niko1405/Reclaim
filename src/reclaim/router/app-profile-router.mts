// Copyright (C) 2026 - present Juergen Zimmermann, Hochschule Karlsruhe
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
 * Das Modul besteht aus Router für die Verwaltung von App-Profilen.
 * @packageDocumentation
 */

import { Hono, HonoRequest } from 'hono';
import { z } from 'zod';
import { container } from '../../container.mts';
import { getLogger } from '../../logger/logger.mts';
import { createPageable } from '../service/pageable.mts';
import { createPage } from './page.mts';

const { appProfileService } = container;

export const router = new Hono();

const logger = getLogger('app-profile-router', 'file');

router.get('/:id', async (c) => {
    const { req } = c;

    if (!checkAccept(req)) return c.body(null, 406);

    const id = req.param('id');
    logger.debug('get: id=%s', id);

    const idResult = z.string().uuid().safeParse(id);
    if (!idResult.success) {
        return c.notFound();
    }

    const appProfile = await appProfileService.findById({ id: idResult.data });

    const ifNoneMatch = req.header('If-None-Match');
    const { version } = appProfile;
    if (ifNoneMatch === `"${version}"`) {
        return c.body(null, 304);
    }

    logger.debug('get: version=%d', version);

    const { header, json } = c;
    header('ETag', `"${version}"`);

    logger.debug('get: %o', appProfile);
    return json(appProfile);
});

router.get('/', async (c) => {
    const { req } = c;

    if (!checkAccept(req)) return c.body(null, 406);

    const queryParams = req.query();

    const countOnly = queryParams['count-only'];
    // Only count the number of app profiles if the query parameter "count-only" is set to "true"
    if (countOnly !== undefined) {
        const count = await appProfileService.count();
        logger.debug('get: count=%d', count);
        return c.json({ count });
    }

    const { page, size } = queryParams;
    delete queryParams['page'];
    delete queryParams['size'];
    logger.debug(
        'get: page=%s, size=%s,  queryParams=%o',
        page,
        size,
        queryParams,
    );

    const pageable = createPageable({ number: page, size });
    const appProfileSlice = await appProfileService.find(queryParams, pageable); // NOSONAR
    const appProfilePage = createPage(appProfileSlice, pageable);
    logger.debug('get: appProfilePage=%o', appProfilePage);
    return c.json(appProfilePage);
});

router.get('/file/:id', async (c) => {
    const id = c.req.param('id');
    logger.debug('download: id=%s', id);

    const avatarFile = await appProfileService.findAvatarByAppProfileId(id);
    if (avatarFile === undefined) {
        return c.notFound();
    }

    return c.body(avatarFile.fileData, {
        headers: { 'Content-Type': avatarFile.mimetype ?? '' },
    });
});

/**
 * Check Accept Header of request
 * @param req request object
 * @param onNotAccept Function to execute when check fails.
 * @returns void
 */
const checkAccept = (req: HonoRequest): boolean => {
    const accept = req.header('Accept')?.toLowerCase() ?? '*/*';
    if (accept !== '*/*' && !/(json|html)/u.test(accept)) {
        logger.debug('get: Accept=%s', accept);

        // Not Acceptable
        return false;
    }
    return true;
};

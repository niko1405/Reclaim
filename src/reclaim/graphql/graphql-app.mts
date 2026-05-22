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

// Yoga wird auch bei Elysia genutzt: https://elysiajs.com/plugins/graphql-yoga

import { createSchema, createYoga } from 'graphql-yoga';
import { Hono } from 'hono';
import { getLogger } from '../../logger/logger.mts';
import {
    createHandler,
    deleteHandler,
    tokenHandler,
    updateHandler,
} from './mutation-handler.mts';
import { appProfileHandler, appProfilesHandler } from './query-handler.mts';
import { rolesRequired } from './roles-required.mts';
import {
    type AppProfilePostInput,
    type AppProfileUpdateInput,
    type ID,
    type SuchParameterInput,
    typeDefs,
} from './types.mts';

const logger = getLogger('graphql-app', 'file');
type GraphqlContext = {
    request: Request;
};

// -----------------------------------------------------------------------------
// R e s o l v e r   p a s s e n d   z u m   G r a p h Q L   S c h e m a
// -----------------------------------------------------------------------------
const resolvers = {
    Query: {
        appProfile: (_: unknown, { id }: { id: ID }) => appProfileHandler(id),
        appProfiles: (_: unknown, { input }: { input?: SuchParameterInput }) =>
            appProfilesHandler(input as never),
    },
    Mutation: {
        create: async (
            _: unknown,
            { input }: { input: AppProfilePostInput },
            { request }: GraphqlContext,
        ) => {
            await rolesRequired(request, 'admin', 'user');
            return createHandler(input as never);
        },
        update: async (
            _: unknown,
            { input }: { input: AppProfileUpdateInput },
            { request }: GraphqlContext,
        ) => {
            await rolesRequired(request, 'admin', 'user');
            return updateHandler(input as never);
        },
        delete: async (
            _: unknown,
            { id }: { id: ID },
            { request }: GraphqlContext,
        ) => {
            await rolesRequired(request, 'admin');
            return deleteHandler(id);
        },
        token: (
            _: unknown,
            { username, password }: { username: string; password: string },
        ) => tokenHandler({ username, password }),
    },
};

// -----------------------------------------------------------------------------
// Y o g a   S e r v e r   m i t   S c h e m a   e i n s c h l.  R e s o l v e r
// -----------------------------------------------------------------------------
const yogaServer = createYoga({
    schema: createSchema({ typeDefs, resolvers }),
});

// -----------------------------------------------------------------------------
// H o n o   A p p   m i t   Y o g a   S e r v e r
// -----------------------------------------------------------------------------
export const app = new Hono();

app.post('/graphql', async (c) => {
    logger.debug('/graphql');
    const { raw } = c.req;
    const { body } = raw;

    // https://github.com/orgs/honojs/discussions/1063#discussioncomment-9121474
    const response = await yogaServer.fetch(raw, { body });

    return c.newResponse(response.body, response);
});

export const graphqlApp = app;

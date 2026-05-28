// oxlint-disable max-lines-per-function
import { beforeAll, describe, expect, test } from 'vitest';
import { AUTHORIZATION, BEARER, DELETE, restURL } from '../constants.mts';
import { getToken } from '../token.mts';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const idVorhanden = '550e8400-e29b-41d4-a716-446655440003';
const idOhneToken = '550e8400-e29b-41d4-a716-446655440001';
const idFalscherToken = '550e8400-e29b-41d4-a716-446655440002';
const idUser = '550e8400-e29b-41d4-a716-446655440004';

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
describe('DELETE /rest', () => {
    let token: string;
    let tokenUser: string;

    beforeAll(async () => {
        token = await getToken('admin', 'p');
        tokenUser = await getToken('user', 'p');
    });

    test.concurrent('Vorhandenes AppProfile loeschen', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const { status } = await fetch(url, {
            method: DELETE,
            headers,
        });

        // then
        expect(status).toBe(204);
    });

    test.concurrent('AppProfile loeschen, aber ohne Token', async () => {
        // given
        const url = `${restURL}/${idOhneToken}`;

        // when
        const { status } = await fetch(url, { method: DELETE });

        // then
        expect(status).toBe(401);
    });

    test.concurrent(
        'AppProfile loeschen, aber mit falschem Token',
        async () => {
            // given
            const url = `${restURL}/${idFalscherToken}`;
            const headers = new Headers();
            headers.append(AUTHORIZATION, `${BEARER} FALSCHER_TOKEN`);

            // when
            const { status } = await fetch(url, {
                method: DELETE,
                headers,
            });

            // then
            expect(status).toBe(401);
        },
    );

    test.concurrent('Vorhandenes AppProfile als "user" loeschen', async () => {
        // given
        const url = `${restURL}/${idUser}`;
        const headers = new Headers();
        headers.append(AUTHORIZATION, `${BEARER} ${tokenUser}`);

        // when
        const { status } = await fetch(url, {
            method: DELETE,
            headers,
        });

        // then
        expect(status).toBe(403);
    });
});

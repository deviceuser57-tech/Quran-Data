import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import errorHandler from './errorHandler.mjs';

test('sanitizes parser and internal errors while preserving client-error statuses', async t => {
    const app = express();
    app.use(express.json());
    app.post('/json', (_req, res) => res.json({ success: true }));
    app.get('/internal', () => {
        throw new Error('INTERNAL_SENTINEL D:\\private\\source.mjs');
    });
    app.get('/client-error', (_req, _res, next) => {
        const error = new Error('CLIENT_SENTINEL');
        error.status = 422;
        next(error);
    });
    app.use(errorHandler);

    t.mock.method(console, 'error', () => {});

    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    t.after(() => {
        server.closeAllConnections();
        return new Promise(resolve => server.close(resolve));
    });

    const origin = `http://127.0.0.1:${server.address().port}`;
    const malformedJson = await fetch(`${origin}/json`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{invalid',
    });
    const malformedBody = await malformedJson.text();
    assert.equal(malformedJson.status, 400);
    assert.match(malformedBody, /Invalid JSON payload/);
    assert.doesNotMatch(malformedBody, /SyntaxError|stack|node_modules|at /i);

    const internalError = await fetch(`${origin}/internal`);
    const internalBody = await internalError.text();
    assert.equal(internalError.status, 500);
    assert.match(internalBody, /An unexpected error occurred/);
    assert.doesNotMatch(internalBody, /INTERNAL_SENTINEL|D:\\\\private|stack|errorHandler\.test\.mjs|node_modules|at /i);

    const clientError = await fetch(`${origin}/client-error`);
    const clientBody = await clientError.text();
    assert.equal(clientError.status, 422);
    assert.match(clientBody, /Invalid request/);
    assert.doesNotMatch(clientBody, /CLIENT_SENTINEL|stack|node_modules/i);
});

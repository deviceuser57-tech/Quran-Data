import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fs from 'fs-extra';
import apiRoutes from '../routes/apiRoutes.mjs';
import errorHandler from '../utils/errorHandler.mjs';
import {
    getAllVerses,
    getAudio,
    getPage,
    getSurah,
    getVerse,
} from './surahController.mjs';

function requestController(controller, query = {}, params = {}) {
    const req = {
        query,
        params,
        method: 'GET',
        originalUrl: '/api/pages',
    };
    const res = {
        req,
        statusCode: 200,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
    };

    controller(req, res);
    return res;
}

function requestPage(query = {}, params = {}) {
    return requestController(getPage, query, params);
}

test('looks up exactly the page containing a verse', () => {
    const response = requestPage({ surah_id: '2', verse_id: '15' });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body.result.map(item => item.page), [3]);
});

test('matches verses on pages spanning a surah boundary', () => {
    const response = requestPage({ surah_id: '5', verse_id: '1' });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body.result.map(item => item.page), [106]);
});

test('returns every page overlapping a surah when no verse is given', () => {
    const response = requestPage({ surah_id: '5' });

    assert.equal(response.statusCode, 200);
    assert.ok(response.body.result.some(item => item.page === 106));
    assert.ok(response.body.result.every(item => item.start.surah_number <= 5 && item.end.surah_number >= 5));
});

test('rejects invalid and incomplete lookup parameters', () => {
    assert.equal(requestPage({ surah_id: '2x', verse_id: '15' }).statusCode, 400);
    assert.equal(requestPage({ surah_id: '2', verse_id: '999' }).statusCode, 400);
    assert.equal(requestPage({ verse_id: '15' }).statusCode, 400);
    assert.equal(requestPage({ page: '605' }).statusCode, 400);
});

test('preserves valid Surah, verse, and audio lookups at their domain boundaries', () => {
    for (const surahId of ['1', '2', '114']) {
        assert.equal(requestController(getSurah, { surah_id: surahId }).statusCode, 200);
        assert.equal(requestController(getAllVerses, { surah_id: surahId }).statusCode, 200);
        assert.ok([200, 404].includes(requestController(getAudio, { surah_id: surahId }).statusCode));
    }

    for (const [surahId, verseId] of [['1', '1'], ['2', '15'], ['2', '286']]) {
        assert.equal(
            requestController(getVerse, { surah_id: surahId, verse_id: verseId }).statusCode,
            200
        );
    }
});

test('rejects malformed, out-of-range, and traversal-shaped IDs before filesystem access', t => {
    assert.equal(requestController(getVerse, { surah_id: '1', verse_id: '8' }).statusCode, 400);

    const existsSync = t.mock.method(fs, 'existsSync', () => {
        throw new Error('Invalid IDs must not reach filesystem lookup.');
    });
    const readJSONSync = t.mock.method(fs, 'readJSONSync', () => {
        throw new Error('Invalid IDs must not reach filesystem reads.');
    });
    const invalidSurahIds = [
        '',
        '0',
        '115',
        '-1',
        '1.5',
        '2abc',
        '001',
        '..\\..\\outside',
        '../../outside',
        '/etc/passwd',
        'C:\\Windows\\win.ini',
        '999999999999999999999',
    ];

    assert.equal(requestController(getSurah).statusCode, 400);
    assert.equal(requestController(getAllVerses, { surah_id: '' }, { surah_id: '2' }).statusCode, 400);

    for (const value of invalidSurahIds) {
        assert.equal(requestController(getSurah, { surah_id: value }).statusCode, 400, value);
        assert.equal(requestController(getAllVerses, {}, { surah_id: value }).statusCode, 400, value);
        assert.equal(requestController(getAudio, { surah_id: value }).statusCode, 400, value);
        assert.equal(requestController(getVerse, { surah_id: value, verse_id: '1' }).statusCode, 400, value);
    }

    for (const value of ['', '0', '-1', '1.5', '287', '2abc', '../../outside', '..\\..\\outside', '999999999999999999999']) {
        assert.equal(requestController(getVerse, { surah_id: '1', verse_id: value }).statusCode, 400, value);
    }

    assert.equal(requestController(getVerse, { surah_id: '1' }).statusCode, 400);
    assert.equal(existsSync.mock.callCount(), 0);
    assert.equal(readJSONSync.mock.callCount(), 0);
});

test('does not disclose filesystem exceptions from file-backed handlers', t => {
    t.mock.method(fs, 'existsSync', () => true);
    t.mock.method(fs, 'readJSONSync', () => {
        throw new Error('INTERNAL_SENTINEL D:\\private\\source.json');
    });

    const response = requestController(getSurah, { surah_id: '1' });
    const serialized = JSON.stringify(response.body);

    assert.equal(response.statusCode, 500);
    assert.doesNotMatch(serialized, /INTERNAL_SENTINEL|D:\\\\private|stack/i);
});

test('rejects encoded traversal values through the mounted API routes', async t => {
    const app = express();
    app.use('/api', apiRoutes);
    app.use(errorHandler);
    const server = app.listen(0, '127.0.0.1');

    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => {
        server.closeAllConnections();
        return new Promise(resolve => server.close(resolve));
    });

    const origin = `http://127.0.0.1:${server.address().port}`;
    const attackPaths = [
        '/api/surah?surah_id=%2e%2e%2f..%2foutside',
        '/api/verses?surah_id=..%5c..%5coutside',
        '/api/verse?surah_id=1&verse_id=%252e%252e%252foutside',
        '/api/audio?surah_id=%2Fetc%2Fpasswd',
    ];

    for (const attackPath of attackPaths) {
        const response = await fetch(`${origin}${attackPath}`);
        const body = await response.text();
        assert.equal(response.status, 400, attackPath);
        assert.doesNotMatch(body, /stack|node_modules|D:\\\\|internal sentinel/i);
    }
});

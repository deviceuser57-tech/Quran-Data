import test from 'node:test';
import assert from 'node:assert/strict';
import { getPage } from './surahController.mjs';

function requestPage(query = {}, params = {}) {
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

    getPage(req, res);
    return res;
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

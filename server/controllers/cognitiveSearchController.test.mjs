import test from 'node:test';
import assert from 'node:assert/strict';

test('does not disclose upstream configuration errors to clients', async t => {
    const previousApiKey = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'your_gemini_api_key_here';
    t.after(() => {
        if (previousApiKey === undefined) {
            delete process.env.GEMINI_API_KEY;
        } else {
            process.env.GEMINI_API_KEY = previousApiKey;
        }
    });

    const { handleCognitiveSearch } = await import('./cognitiveSearchController.mjs');
    t.mock.method(console, 'error', () => {});

    const req = {
        body: { query: 'security regression test' },
        query: {},
    };
    const res = {
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

    await handleCognitiveSearch(req, res);

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error, 'حدث خطأ أثناء معالجة البحث المعرفي. يرجى المحاولة لاحقًا.');
    assert.doesNotMatch(JSON.stringify(res.body), /GEMINI_API_KEY|your_gemini|stack|node_modules/i);
});

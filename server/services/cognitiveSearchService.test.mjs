import test from 'node:test';
import assert from 'node:assert/strict';
import { runCognitiveSearch, getLLMAdapter } from './cognitiveSearchService.mjs';

test('runCognitiveSearch throws error when GEMINI_API_KEY is unconfigured', async t => {
    const previousApiKey = process.env.GEMINI_API_KEY;
    const previousProvider = process.env.TEST_LLM_PROVIDER;
    delete process.env.TEST_LLM_PROVIDER;
    process.env.GEMINI_API_KEY = 'your_gemini_api_key_here';
    t.after(() => {
        if (previousApiKey === undefined) {
            delete process.env.GEMINI_API_KEY;
        } else {
            process.env.GEMINI_API_KEY = previousApiKey;
        }
        if (previousProvider === undefined) {
            delete process.env.TEST_LLM_PROVIDER;
        } else {
            process.env.TEST_LLM_PROVIDER = previousProvider;
        }
    });

    await assert.rejects(
        () => runCognitiveSearch('تفسير آية'),
        /يرجى تحديد مفتاح GEMINI_API_KEY/
    );
});

test('getLLMAdapter throws MISSING_CONFIGURATION for groq when key is missing', t => {
    assert.throws(
        () => getLLMAdapter({ provider: 'groq', apiKey: '' }),
        err => err.code === 'MISSING_CONFIGURATION' && err.message.includes('GROQ')
    );
});

test('getLLMAdapter throws PROVIDER_UNAVAILABLE for unsupported provider', t => {
    assert.throws(
        () => getLLMAdapter({ provider: 'unknown_provider', apiKey: 'dummy_key' }),
        err => err.code === 'PROVIDER_UNAVAILABLE'
    );
});

test('getLLMAdapter creates groq adapter instance structurally', t => {
    const adapter = getLLMAdapter({ provider: 'groq', apiKey: 'dummy_groq_key' });
    assert.equal(adapter.provider, 'groq');
    assert.equal(typeof adapter.generateContent, 'function');
});

test('getLLMAdapter creates gemini adapter instance structurally', t => {
    const adapter = getLLMAdapter({ provider: 'gemini', apiKey: 'dummy_gemini_key' });
    assert.equal(adapter.provider, 'gemini');
    assert.equal(typeof adapter.generateContent, 'function');
});

test('groq fallback catalog order is corrected and contains no stale models', async t => {
    const attempted = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, opts) => {
        attempted.push(JSON.parse(opts.body).model);
        return {
            ok: false,
            status: 404,
            statusText: 'Not Found',
            json: async () => ({ error: { message: 'model_not_found' } })
        };
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const adapter = getLLMAdapter({ provider: 'groq', apiKey: 'dummy_groq_key' });
    await assert.rejects(
        () => adapter.generateContent({ prompt: 'x' }),
        err => err.code === 'MODEL_UNAVAILABLE'
    );

    assert.deepEqual(attempted, ['openai/gpt-oss-20b', 'openai/gpt-oss-120b']);
});

test('TEST_LLM_MODEL overrides the groq fallback list', async t => {
    const previousModel = process.env.TEST_LLM_MODEL;
    process.env.TEST_LLM_MODEL = 'env-override/test-model';
    t.after(() => {
        if (previousModel === undefined) {
            delete process.env.TEST_LLM_MODEL;
        } else {
            process.env.TEST_LLM_MODEL = previousModel;
        }
    });

    const attempted = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, opts) => {
        attempted.push(JSON.parse(opts.body).model);
        return {
            ok: true,
            json: async () => ({ choices: [{ message: { content: 'ok' } }] })
        };
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    const adapter = getLLMAdapter({ provider: 'groq', apiKey: 'dummy_groq_key' });
    const res = await adapter.generateContent({ prompt: 'x' });
    assert.equal(res.text, 'ok');
    assert.deepEqual(attempted, ['env-override/test-model']);
});

test('adapter construction performs no network request', async t => {
    let calls = 0;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
        calls += 1;
        throw new Error('network disabled in test');
    };
    t.after(() => { globalThis.fetch = originalFetch; });

    getLLMAdapter({ provider: 'groq', apiKey: 'dummy_groq_key' });
    getLLMAdapter({ provider: 'gemini', apiKey: 'dummy_gemini_key' });
    assert.equal(calls, 0);
});


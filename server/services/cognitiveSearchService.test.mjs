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


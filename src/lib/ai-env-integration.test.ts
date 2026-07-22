import ava from 'ava'
import { resolveModel } from './ai'
import '../api/global.js'

// This is a simple integration test to verify the basic functionality
// For full unit testing, we would need to refactor the ai.ts module
// to allow dependency injection of the apiKeyCache

ava('resolveModel should create OpenAI model when API key exists', async t => {
    // Skip in CI or when no real API key is available
    if (!process.env.OPENAI_API_KEY || process.env.CI) {
        t.pass('Skipping test - requires OPENAI_API_KEY')
        return
    }
    
    const originalKey = process.env.OPENAI_API_KEY
    
    try {
        const model = await resolveModel('gpt-4')
        
        // Verify model was created
        t.truthy(model)
        if (typeof model !== 'string') {
            t.is(model.provider, 'openai.chat')
            t.is(model.modelId, 'gpt-4')
        } else {
            t.fail('Expected model object, got string')
        }
    } finally {
        process.env.OPENAI_API_KEY = originalKey
    }
})

ava('resolveModel should create Anthropic model with prefix', async t => {
    // Skip in CI or when no real API key is available
    if (!process.env.ANTHROPIC_API_KEY || process.env.CI) {
        t.pass('Skipping test - requires ANTHROPIC_API_KEY')
        return
    }
    
    const originalKey = process.env.ANTHROPIC_API_KEY
    
    try {
        const model = await resolveModel('anthropic:claude-3-opus-20240229')
        
        // Verify model was created
        t.truthy(model)
        if (typeof model !== 'string') {
            t.is(model.provider, 'anthropic.messages')
            t.is(model.modelId, 'claude-3-opus-20240229')
        } else {
            t.fail('Expected model object, got string')
        }
    } finally {
        process.env.ANTHROPIC_API_KEY = originalKey
    }
})

ava('resolveModel should use default provider when no prefix', async t => {
    // Skip in CI or when no real API key is available
    if (!process.env.OPENAI_API_KEY || process.env.CI) {
        t.pass('Skipping test - requires OPENAI_API_KEY')
        return
    }
    
    const originalKey = process.env.OPENAI_API_KEY
    const originalProvider = process.env.KIT_AI_DEFAULT_PROVIDER
    process.env.KIT_AI_DEFAULT_PROVIDER = 'openai'
    
    try {
        const model = await resolveModel('some-model')
        
        // Verify model was created with default provider
        t.truthy(model)
        if (typeof model !== 'string') {
            t.is(model.provider, 'openai.chat')
            t.is(model.modelId, 'some-model')
        } else {
            t.fail('Expected model object, got string')
        }
    } finally {
        process.env.OPENAI_API_KEY = originalKey
        if (originalProvider !== undefined) {
            process.env.KIT_AI_DEFAULT_PROVIDER = originalProvider
        } else {
            delete process.env.KIT_AI_DEFAULT_PROVIDER
        }
    }
})

ava('resolveModel should handle explicit provider parameter', async t => {
    // Skip in CI or when no real API key is available
    if (!process.env.GOOGLE_API_KEY || process.env.CI) {
        t.pass('Skipping test - requires GOOGLE_API_KEY')
        return
    }
    
    const originalKey = process.env.GOOGLE_API_KEY
    
    try {
        const model = await resolveModel('gemini-pro', 'google')
        
        // Verify model was created with explicit provider
        t.truthy(model)
        if (typeof model !== 'string') {
            t.is(model.provider, 'google.generative-ai')
            t.is(model.modelId, 'gemini-pro')
        } else {
            t.fail('Expected model object, got string')
        }
    } finally {
        process.env.GOOGLE_API_KEY = originalKey
    }
})

// Note: Testing the actual prompting behavior would require:
// 1. Mocking the global.env function properly
// 2. Clearing the internal apiKeyCache between tests
// 3. Potentially refactoring the ai.ts module to support dependency injection
//
// For now, these integration tests verify the basic functionality
// when API keys are already set.
ava('resolveModel honours OPENAI_BASE_URL when set', async t => {
    const originalBase = process.env.OPENAI_BASE_URL
    const originalKey = process.env.OPENAI_API_KEY

    try {
        process.env.OPENAI_BASE_URL = 'http://localhost:20128/v1'
        process.env.OPENAI_API_KEY = 'test-key'

        const model = await resolveModel('gpt-4')

        t.truthy(model)
        if (typeof model === 'string') {
            t.fail('Expected model object, got string')
            return
        }
        // The point is that construction succeeds against the custom baseURL
        // rather than falling back to the pinned api.openai.com singleton.
        // Don't pin the exact provider id — @ai-sdk/openai reports
        // 'openai.responses' or 'openai.chat' depending on the model path.
        t.true(model.provider.startsWith('openai'))
        t.is(model.modelId, 'gpt-4')
    } finally {
        if (originalBase === undefined) delete process.env.OPENAI_BASE_URL
        else process.env.OPENAI_BASE_URL = originalBase
        if (originalKey === undefined) delete process.env.OPENAI_API_KEY
        else process.env.OPENAI_API_KEY = originalKey
    }
})

ava('resolveModel is unchanged when no base URL is set', async t => {
    const originalBase = process.env.OPENAI_BASE_URL
    const originalKey = process.env.OPENAI_API_KEY

    try {
        delete process.env.OPENAI_BASE_URL
        process.env.OPENAI_API_KEY = 'test-key'

        const model = await resolveModel('gpt-4')

        t.truthy(model)
        if (typeof model === 'string') {
            t.fail('Expected model object, got string')
            return
        }
        t.true(model.provider.startsWith('openai'))
    } finally {
        if (originalBase === undefined) delete process.env.OPENAI_BASE_URL
        else process.env.OPENAI_BASE_URL = originalBase
        if (originalKey === undefined) delete process.env.OPENAI_API_KEY
        else process.env.OPENAI_API_KEY = originalKey
    }
})

ava('custom provider resolves against KIT_AI_CUSTOM_BASE_URL', async t => {
    const saved = {
        provider: process.env.KIT_AI_DEFAULT_PROVIDER,
        base: process.env.KIT_AI_CUSTOM_BASE_URL,
        key: process.env.KIT_AI_CUSTOM_API_KEY
    }

    try {
        process.env.KIT_AI_CUSTOM_BASE_URL = 'http://localhost:20128/v1'
        process.env.KIT_AI_CUSTOM_API_KEY = 'test-key'

        const model = await resolveModel('custom:some-model')

        t.truthy(model)
        if (typeof model === 'string') {
            t.fail('Expected model object, got string')
            return
        }
        t.true(model.provider.startsWith('custom'))
        t.is(model.modelId, 'some-model')
    } finally {
        for (const [k, v] of Object.entries({
            KIT_AI_DEFAULT_PROVIDER: saved.provider,
            KIT_AI_CUSTOM_BASE_URL: saved.base,
            KIT_AI_CUSTOM_API_KEY: saved.key
        })) {
            if (v === undefined) delete process.env[k]
            else process.env[k] = v
        }
    }
})

ava('custom provider without a base URL throws a helpful error', async t => {
    const saved = process.env.KIT_AI_CUSTOM_BASE_URL
    try {
        delete process.env.KIT_AI_CUSTOM_BASE_URL
        process.env.KIT_AI_CUSTOM_API_KEY = 'test-key'
        await t.throwsAsync(() => resolveModel('custom:some-model'),
            { message: /KIT_AI_CUSTOM_BASE_URL/ })
    } finally {
        if (saved === undefined) delete process.env.KIT_AI_CUSTOM_BASE_URL
        else process.env.KIT_AI_CUSTOM_BASE_URL = saved
    }
})

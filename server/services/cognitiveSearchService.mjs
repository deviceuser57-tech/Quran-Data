import { GoogleGenAI } from '@google/genai';
import config from '../config.mjs';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', '..', 'data', 'json');

let metadataCache = null;
const surahCache = new Map();

/**
 * Load metadata of all surahs
 */
async function getMetadata() {
    if (!metadataCache) {
        metadataCache = await fs.readJson(path.join(dataDir, 'metadata.json'));
    }
    return metadataCache;
}

/**
 * Load specific surah data
 */
async function getSurahData(surahNumber) {
    if (surahCache.has(surahNumber)) {
        return surahCache.get(surahNumber);
    }
    const filePath = path.join(dataDir, 'surah', `surah_${surahNumber}.json`);
    if (await fs.pathExists(filePath)) {
        const data = await fs.readJson(filePath);
        surahCache.set(surahNumber, data);
        return data;
    }
    return null;
}

const GEMINI_FALLBACK_MODELS = [
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash'
];

const GROQ_FALLBACK_MODELS = [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'mixtral-8x7b-32768'
];

/**
 * Provider-Neutral LLM Adapter Factory
 */
export function getLLMAdapter(overrides = {}) {
    const provider = (overrides.provider || process.env.TEST_LLM_PROVIDER || 'gemini').toLowerCase();
    const apiKey = overrides.apiKey || process.env.TEST_LLM_API_KEY || (provider === 'groq' ? process.env.GROQ_API_KEY : (process.env.GEMINI_API_KEY || config.geminiApiKey));
    const modelOverride = overrides.model || process.env.TEST_LLM_MODEL;

    if (!apiKey || apiKey === 'your_gemini_api_key_here' || apiKey === 'your_groq_api_key_here') {
        const err = new Error(
            provider === 'gemini'
                ? 'MISSING_CONFIGURATION: يرجى تحديد مفتاح GEMINI_API_KEY في ملف .env لتشغيل محرك البحث المعرفي.'
                : `MISSING_CONFIGURATION: ${provider.toUpperCase()} API key is not configured.`
        );
        err.code = 'MISSING_CONFIGURATION';
        throw err;
    }

    if (provider === 'gemini') {
        return createGeminiAdapter(apiKey, modelOverride);
    } else if (provider === 'groq') {
        return createGroqAdapter(apiKey, modelOverride);
    } else {
        const err = new Error(`PROVIDER_UNAVAILABLE: Unsupported provider '${provider}'`);
        err.code = 'PROVIDER_UNAVAILABLE';
        throw err;
    }
}

function createGeminiAdapter(apiKey, customModel) {
    const genAI = new GoogleGenAI({ apiKey });
    const models = customModel ? [customModel] : GEMINI_FALLBACK_MODELS;

    return {
        provider: 'gemini',
        async generateContent(options = {}) {
            const { prompt, responseMimeType, temperature = 0.1 } = options;
            const genConfig = {};
            if (responseMimeType) genConfig.responseMimeType = responseMimeType;
            if (temperature !== undefined) genConfig.temperature = temperature;

            let lastErr = null;
            for (const model of models) {
                try {
                    const res = await genAI.models.generateContent({
                        model,
                        contents: prompt,
                        config: genConfig
                    });
                    return { text: res.text };
                } catch (err) {
                    lastErr = err;
                    if (err.status === 401 || err.status === 403) {
                        const normErr = new Error('AUTHENTICATION_FAILURE: Invalid or unauthorized Gemini API key');
                        normErr.code = 'AUTHENTICATION_FAILURE';
                        normErr.originalError = err;
                        throw normErr;
                    }
                    if (err.status === 429) {
                        const normErr = new Error('RATE_LIMIT: Gemini rate limit exceeded');
                        normErr.code = 'RATE_LIMIT';
                        normErr.originalError = err;
                        throw normErr;
                    }
                    if (err.status === 503 || err.status === 404) {
                        continue;
                    }
                    const normErr = new Error(`PROVIDER_UNAVAILABLE: Gemini error - ${err.message || err}`);
                    normErr.code = 'PROVIDER_UNAVAILABLE';
                    normErr.originalError = err;
                    throw normErr;
                }
            }
            const normErr = new Error(`MODEL_UNAVAILABLE: All Gemini models failed. Last error: ${lastErr?.message || lastErr}`);
            normErr.code = 'MODEL_UNAVAILABLE';
            normErr.originalError = lastErr;
            throw normErr;
        }
    };
}

function createGroqAdapter(apiKey, customModel) {
    const models = customModel ? [customModel] : GROQ_FALLBACK_MODELS;

    return {
        provider: 'groq',
        async generateContent(options = {}) {
            const { prompt, responseMimeType, temperature = 0.1, timeoutMs = 30000 } = options;
            let lastErr = null;

            for (const model of models) {
                try {
                    const controller = new AbortController();
                    const timer = setTimeout(() => controller.abort(), timeoutMs);

                    const body = {
                        model,
                        messages: [{ role: 'user', content: prompt }],
                        temperature
                    };
                    if (responseMimeType === 'application/json') {
                        body.response_format = { type: 'json_object' };
                    }

                    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(body),
                        signal: controller.signal
                    }).finally(() => clearTimeout(timer));

                    if (!response.ok) {
                        const errData = await response.json().catch(() => ({}));
                        const errMsg = errData.error?.message || response.statusText;
                        if (response.status === 401 || response.status === 403) {
                            const err = new Error(`AUTHENTICATION_FAILURE: Groq auth failed - ${errMsg}`);
                            err.code = 'AUTHENTICATION_FAILURE';
                            throw err;
                        }
                        if (response.status === 429) {
                            const err = new Error(`RATE_LIMIT: Groq rate limit exceeded - ${errMsg}`);
                            err.code = 'RATE_LIMIT';
                            throw err;
                        }
                        if (response.status === 503 || response.status === 502 || response.status === 504 || response.status === 404) {
                            lastErr = new Error(`PROVIDER_UNAVAILABLE: Groq server error ${response.status} - ${errMsg}`);
                            lastErr.code = 'PROVIDER_UNAVAILABLE';
                            continue;
                        }
                        const err = new Error(`PROVIDER_UNAVAILABLE: Groq returned status ${response.status} - ${errMsg}`);
                        err.code = 'PROVIDER_UNAVAILABLE';
                        throw err;
                    }

                    const data = await response.json();
                    const content = data.choices?.[0]?.message?.content;
                    if (!content) {
                        const err = new Error('MALFORMED_PROVIDER_RESPONSE: Groq returned empty content');
                        err.code = 'MALFORMED_PROVIDER_RESPONSE';
                        throw err;
                    }
                    return { text: content };
                } catch (err) {
                    if (err.name === 'AbortError') {
                        const timeoutErr = new Error('TIMEOUT: Request to Groq timed out');
                        timeoutErr.code = 'TIMEOUT';
                        throw timeoutErr;
                    }
                    if (err.code) throw err;
                    lastErr = err;
                }
            }
            const normErr = new Error(`MODEL_UNAVAILABLE: All Groq models failed. Last error: ${lastErr?.message || lastErr}`);
            normErr.code = 'MODEL_UNAVAILABLE';
            normErr.originalError = lastErr;
            throw normErr;
        }
    };
}

/**
 * Layer 0: Intent Calibration & Research Mode Resolver
 */
function resolveResearchMode(userMode, query) {
    if (userMode && ['tadabbur', 'heritage', 'knowledge'].includes(userMode)) {
        return userMode;
    }
    // Heuristic detection if not specified
    const q = query.toLowerCase();
    if (q.includes('تفسير') || q.includes('أقوال') || q.includes('ابن كثير') || q.includes('الطبري') || q.includes('إعراب') || q.includes('لغة')) {
        return 'heritage';
    }
    if (q.includes('علم') || q.includes('أعصاب') || q.includes('فيزياء') || q.includes('طب') || q.includes('تاريخ')) {
        return 'knowledge';
    }
    return 'tadabbur'; // default to exploratory tadabbur
}

/**
 * Layer 1: Morphological & Syntactic Query Engine
 */
async function morphologicalEngineAgent(adapter, userQuery, mode) {
    const prompt = `
أنت "المحرك الصرفي والتركيبي القرآني" (Quranic Morphological & Syntactic Engine) ضمن نظام التشغيل البحثي القرآني (Quranic Cognitive Research OS).
النمط البحثي المعتمد: [${mode}].

المطلوب تحليل استعلام الباحث تحليلاً لغوياً وتركيبياً دقيقاً، مع مراعاة القواعد الملزمة:
1. استخراج الجذر الصرفي، الوزن، والمشتقات المتوقعة في القرآن.
2. فحص السياق التركيبي (الموقع الإعرابي المتوقع وأثره الدلالي).
3. فحص الحروف الملابسة (حروف الجر، الاستثناء، النفي، العطف، التبعيض) التي تصنع "الصيغ المنطقية".

استعلام الباحث: "${userQuery}"

أرجع النتيجة بصيغة JSON فقط:
{
  "intent": "شرح موجز لنية وقصد الباحث",
  "search_mode": "${mode}",
  "root": "الجذر اللغوي الأساسي",
  "syntactic_analysis": "تحليل الموقع التركيبي والإعرابي ودلالته",
  "prepositional_impact": "أثر حروف المعاني والأدوات الملابسة في المعنى",
  "logical_formula": "الصيغة المنطقية المستخلصة (مثال: [أمر كُن] -> [تكوين فَيَكُون] أو [نفي] + [استثناء])",
  "keywords": ["الكلمات والمشتقات المستهدفة في البحث"],
  "themes": ["الموضوعات القرآنية"]
}
`;

    const response = await adapter.generateContent({
        prompt,
        responseMimeType: 'application/json',
        temperature: 0.1
    });

    try {
        return JSON.parse(response.text);
    } catch {
        return {
            intent: userQuery,
            search_mode: mode,
            root: "",
            syntactic_analysis: "تحليل عام للمفهوم",
            prepositional_impact: "",
            logical_formula: userQuery,
            keywords: [userQuery],
            themes: [userQuery]
        };
    }
}

/**
 * Layer 2: Raw Quranic Extraction & Intra-Quranic Resonance Agent (Tier 0 Priority)
 */
async function intraQuranicResonanceAgent(adapter, userQuery, morphData) {
    const metadata = await getMetadata();
    const surahSummary = metadata.map(s => `${s.number}. سورة ${s.name.ar}`).join('، ');

    const prompt = `
أنت "وكيل الاسترجاع القرآني والرنين الداخلي" (Intra-Quranic Resonance & Extraction Agent) وفق الهرمية الإبستمولوجية للدستور البحثي.
- استعلام الباحث: "${userQuery}"
- التحليل الصرفي والمنطقي: ${JSON.stringify(morphData, null, 2)}
- قاعدة بيانات السور المتاحة: ${surahSummary}

القواعد الملزمة:
1. أولوية الرنين الداخلي: ابحث عن الآيات التي تفسر بعضها بعضاً (تفسير القرآن بالقرآن في Tier 0) كعقد ربط أولية.
2. منع الاختزال: حدد مواضع نصية صريحة وثابتة (من 3 إلى 8 آيات مركزية تمثل رنيناً وتناظراً دلالياً).
3. استخراج المعرف الفريد لكل آية بدقة: السورة ورقم الآية.

أرجع النتيجة بصيغة JSON فقط:
{
  "candidates": [
    {
      "surah_number": 2,
      "verse_number": 255,
      "resonance_reason": "وجه الارتباط والرنين الداخلي مع المفهوم والآيات الأخرى",
      "syntactic_note": "إضاءة حول التركيب اللغوي أو حرف المعنى في الموضع"
    }
  ],
  "resonance_network": "شرح لشبكة الرنين والتناظر الداخلي بين هذه الآيات وسياقات السور"
}
`;

    const response = await adapter.generateContent({
        prompt,
        responseMimeType: 'application/json',
        temperature: 0.1
    });

    try {
        const data = JSON.parse(response.text);
        const candidates = data.candidates || [];
        const hydratedVerses = [];

        for (const item of candidates) {
            const surah = await getSurahData(item.surah_number);
            if (surah && surah.verses) {
                const verse = surah.verses.find(v => v.number === item.verse_number);
                if (verse) {
                    hydratedVerses.push({
                        ref_id: `[Ref: T0-QURAN-S${String(surah.number).padStart(3, '0')}-A${String(verse.number).padStart(3, '0')}]`,
                        tier: "Tier 0",
                        surah_number: surah.number,
                        surah_name: surah.name.ar,
                        surah_english: surah.name.en,
                        revelation_place: surah.revelation_place.ar,
                        verse_number: verse.number,
                        arabic_text: verse.text.ar,
                        english_text: verse.text.en,
                        juz: verse.juz,
                        page: verse.page,
                        resonance_reason: item.resonance_reason,
                        syntactic_note: item.syntactic_note
                    });
                }
            }
        }

        return {
            verses: hydratedVerses,
            resonance_network: data.resonance_network || ""
        };
    } catch {
        return { verses: [], resonance_network: "" };
    }
}

/**
 * Layer 3 & 4: Epistemic Sourcing, Guard Agent & Pathways Synthesis
 */
async function epistemicSynthesisAgent(adapter, userQuery, mode, morphData, resonanceData) {
    const prompt = `
أنت "المحرك المعرفي والتحليلي لنظام التشغيل البحثي القرآني" (Cognitive Synthesis & Guard Agent).
أنت مقيد تماماً بـ "الدستور التأسيسي لنظام التشغيل البحثي القرآني":
- النمط المعرفي المعتمد: [${mode}]
- استعلام الباحث: "${userQuery}"
- التحليل الصرفي والتركيبي: ${JSON.stringify(morphData, null, 2)}
- الآيات المسترجعة (Tier 0 - الرنين الداخلي): ${JSON.stringify(resonanceData.verses, null, 2)}
- شبكة الرنين الداخلي: ${resonanceData.resonance_network}

التزم بالقواعد الحتمية الست:
1. [بروتوكول الاستشهاد العكسي]: لا تكتب أسماء المصادر إنشائياً فقط، بل أدرج المعرفات الفريدة [Ref IDs] بصيغة:
   - [Ref: T2-Tabari-Sxx-Ax]
   - [Ref: T2-IbnKathir-Sxx-Ax]
   - [Ref: T2-Qurtubi-Sxx-Ax]
   - [Ref: T2-Razi-Sxx-Ax]
   - [Ref: T1-Hadith-Bukhari-xxxx]
   - [Ref: T4-Science-Paper-Year]
2. [قاعدة العزلة السياقية للوكيل الحارس]: ارفض صراحة أي مسار تدبري أو علمي ينتزع آية من سياقها الأصلي لخدمة فرضية لا يحتملها السياق العام للسورة.
3. [التجاور لا الاندماج]: اعرض تباينات وتنوع المفسرين متجاورة دون اختلاق توفيق قسري.
4. [الإدارة الزمنية]: عند إيراد معارف علمية (Tier 4)، اذكر تاريخ المعرفة أو الدراسة، وميز بين النظرية والفرضية القابلة للنقض.
5. [الحيادية المذهبية]: لا ترجح مذهباً ولا تستخدم "الراجح/الضعيف" من عندك دون إسناد دقيق بين علامتي تنصيص.
6. [السيادة للباحث]: اطرح أسئلة استكشافية مفتوحة، وضع وسماً إلزامياً على كل فرضية: [فرضية استكشافية - غير قطعية].

أرجع النتيجة بصيغة JSON فقط:
{
  "node_1_raw_and_morphology": {
    "root": "${morphData.root}",
    "syntactic_summary": "${morphData.syntactic_analysis}",
    "logical_formula": "${morphData.logical_formula}",
    "resonance_network": "${resonanceData.resonance_network}"
  },
  "node_2_sources_matrix": [
    {
      "source_name": "اسم المرجع التراثي أو المفسر",
      "ref_id": "[Ref: T2-Author-Location]",
      "tier": "Tier 2",
      "summary": "نص القول أو ملخصه الأمين",
      "divergence_note": "موضع التباين أو الاختلاف إن وجد (أو 'اتفاق دلالي')"
    }
  ],
  "node_3_methodological_pathways": [
    {
      "path_name": "اسم المسار (مثال: المسار الدلالي/الكوني/القيادي القلبي)",
      "tier": "Tier 5 (أو تقاطع Tier 4)",
      "is_exploratory": true,
      "tag": "[فرضية استكشافية - غير قطعية]",
      "thesis": "شرح الفكرة والفرضية التدبرية",
      "supporting_arguments": "الأدلة النصية والقرائن",
      "guardrail_check": "فحص العزلة السياقية والتوافق مع مقاصد السورة"
    }
  ],
  "node_4_epistemic_limits": {
    "unknown_ghayb": "المسائل الغيبية أو حدود المعرفة التي لا يجوز الجزم فيها نصياً",
    "methodological_caveats": "تنبيهات منهجية وحدود الأدوات المعرفية الحالية"
  },
  "node_5_human_console": {
    "researcher_questions": [
      "سؤال استكشافي مفتوح يعيد الكرة للباحث لاختيار المسار التالي"
    ],
    "red_team_prompt": "اعتراض أو تحدي نقدي قوي لاختبار متانة هذا الطرح ومقاومة المداهنة"
  }
}
`;

    const response = await adapter.generateContent({
        prompt,
        responseMimeType: 'application/json',
        temperature: mode === 'tadabbur' ? 0.4 : 0.1
    });

    try {
        return JSON.parse(response.text);
    } catch {
        return {
            node_1_raw_and_morphology: {
                root: morphData.root,
                syntactic_summary: morphData.syntactic_analysis,
                logical_formula: morphData.logical_formula,
                resonance_network: resonanceData.resonance_network
            },
            node_2_sources_matrix: [],
            node_3_methodological_pathways: [],
            node_4_epistemic_limits: {
                unknown_ghayb: "ما استأثر الله بعلمه",
                methodological_caveats: "يرجى الرجوع لأمهات المصادر للتحقق المباشر"
            },
            node_5_human_console: {
                researcher_questions: ["كيف توجه دلالة الآيات مع سياق السورة؟"],
                red_team_prompt: "هل يحتمل اللفظ وجهاً آخر يخالف هذه الفرضية؟"
            }
        };
    }
}

/**
 * Master Controller: Multi-Agent Orchestrator
 */
export async function runCognitiveSearch(userQuery, requestedMode = null) {
    const adapter = getLLMAdapter();

    // Step 0: Resolve Research Mode
    const mode = resolveResearchMode(requestedMode, userQuery);

    // Step 1: Deep Morphological & Syntactic Engine
    const morphData = await morphologicalEngineAgent(adapter, userQuery, mode);

    // Step 2: Intra-Quranic Resonance & Raw Text Extraction (Tier 0)
    const resonanceData = await intraQuranicResonanceAgent(adapter, userQuery, morphData);

    // Step 3 & 4: Epistemic Sourcing, Guard Agent & 5-Nodes Canvas Synthesis
    const synthesis = await epistemicSynthesisAgent(adapter, userQuery, mode, morphData, resonanceData);

    return {
        query: userQuery,
        mode: mode,
        epistemic_framework: {
            constitution: "Quranic Cognitive Research OS Constitution v1.0",
            hierarchy_order: ["Tier 0 (Quran)", "Tier 1 (Hadith)", "Tier 2 (Tafsir/Lexicon)", "Tier 3 (Ijtihad)", "Tier 4 (Empirical Science)", "Tier 5 (Exploratory Tadabbur)"]
        },
        pipeline_meta: {
            morphological_root: morphData.root,
            logical_formula: morphData.logical_formula,
            retrieved_verses_count: resonanceData.verses.length,
            sources_cited_count: synthesis.node_2_sources_matrix?.length || 0
        },
        results: {
            verses: resonanceData.verses,
            node_1_morphology: synthesis.node_1_raw_and_morphology,
            node_2_sources: synthesis.node_2_sources_matrix,
            node_3_pathways: synthesis.node_3_methodological_pathways,
            node_4_limits: synthesis.node_4_epistemic_limits,
            node_5_console: synthesis.node_5_human_console
        }
    };
}


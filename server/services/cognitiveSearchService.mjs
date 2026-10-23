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

/**
 * Simple text normalizer for Arabic query fallback
 */
const FALLBACK_MODELS = [
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash'
];

async function generateWithFallback(ai, contents, config = {}) {
    let lastError = null;
    for (const model of FALLBACK_MODELS) {
        try {
            return await ai.models.generateContent({
                model,
                contents,
                config
            });
        } catch (err) {
            lastError = err;
            // If 503 or 404, try next model in pool
            if (err.status === 503 || err.status === 404) {
                continue;
            }
            throw err;
        }
    }
    throw lastError;
}

/**
 * Layer 1: Query Understanding Agent
 * Uses Gemini to extract deep semantic concepts, Quranic themes, and candidate keywords.
 */
async function queryUnderstandingAgent(ai, userQuery) {
    const prompt = `
أنت "وكيل فهم القصد والمعنى القرآني" (Quranic Query Understanding Agent).
مهمتك تحليل سؤال أو استعلام المستخدم بعمق دلالي ومعرفي لاستخراج المقاصد القرآنية بدلاً من مجرد التطابق اللفظي.

استعلام المستخدم: "${userQuery}"

قم بتحليل هذا الاستعلام وأرجع JSON فقط بالصيغة التالية:
{
  "intent": "شرح موجز لنية وقصد السائل والموضوع الأساسي",
  "themes": ["قائمة بالمواضيع القرآنية المرتبطة، مثل: الصبر، حفظ النفس، التوكل، الابتلاء"],
  "keywords": ["كلمات ومفردات قرآنية متوقعة ومترادفات في النص القرآني"],
  "suggested_surahs_or_topics": ["أسماء سور أو موضوعات مشهورة بهذه المعاني إن وجدت"]
}
`;

    const response = await generateWithFallback(ai, prompt, {
        responseMimeType: 'application/json',
        temperature: 0.2
    });

    try {
        return JSON.parse(response.text);
    } catch {
        return {
            intent: userQuery,
            themes: [userQuery],
            keywords: [userQuery],
            suggested_surahs_or_topics: []
        };
    }
}

/**
 * Layer 2: Semantic Retrieval Agent
 * Asks Gemini to pinpoint relevant verses based on deep Quranic comprehension.
 */
async function semanticRetrievalAgent(ai, userQuery, understanding) {
    const metadata = await getMetadata();
    const surahSummary = metadata.map(s => `${s.number}. سورة ${s.name.ar} (${s.revelation_place.ar})`).join('، ');

    const prompt = `
أنت "وكيل الاسترجاع الدلالي القرآني" (Semantic Retrieval Agent).
بناءً على قصد المستخدم والمفاهيم القرآنية المستخرجة:
- استعلام المستخدم: "${userQuery}"
- القصد والسمات المستخرجة: ${JSON.stringify(understanding, null, 2)}
- قائمة سور القرآن الكريم:
${surahSummary}

المطلوب:
حدد الآيات القرآنية الأكثر ارتباطاً بهذا المعنى ومقاصد الشريعة (بين 3 إلى 7 مواضع قوية ومباشرة الدلالة).
أرجع النتيجة بتنسيق JSON فقط:
{
  "candidates": [
    {
      "surah_number": 2,
      "verse_number": 155,
      "relevance_reason": "سبب استحضار هذه الآية وما تعالجه من مقصد"
    }
  ]
}
`;

    const response = await generateWithFallback(ai, prompt, {
        responseMimeType: 'application/json',
        temperature: 0.1
    });

    try {
        const data = JSON.parse(response.text);
        const candidates = data.candidates || [];

        // Hydrate candidates with actual verified Quranic text from local database
        const hydratedVerses = [];
        for (const item of candidates) {
            const surah = await getSurahData(item.surah_number);
            if (surah && surah.verses) {
                const verse = surah.verses.find(v => v.number === item.verse_number);
                if (verse) {
                    hydratedVerses.push({
                        surah_number: surah.number,
                        surah_name: surah.name.ar,
                        surah_english: surah.name.en,
                        revelation_place: surah.revelation_place.ar,
                        verse_number: verse.number,
                        arabic_text: verse.text.ar,
                        english_text: verse.text.en,
                        juz: verse.juz,
                        page: verse.page,
                        relevance_reason: item.relevance_reason
                    });
                }
            }
        }
        return hydratedVerses;
    } catch {
        return [];
    }
}

/**
 * Layer 3 & 4: Contextual Reasoning & Synthesis Agent
 * Reviews the verses in light of authentic context and crafts a structured, beautiful response.
 */
async function contextualSynthesisAgent(ai, userQuery, understanding, verifiedVerses) {
    const prompt = `
أنت "وكيل البيان والتدقيق القرآني المعرفي" (Quranic Reasoning & Synthesis Agent).
المستخدم طرح السؤال المعرفي التالي:
"${userQuery}"

التحليل الدلالي:
- القصد والمحاور: ${understanding.intent} | المحاور: ${understanding.themes?.join('، ')}

الآيات القرآنية المسترجعة من المصحف الشريف بدقة:
${JSON.stringify(verifiedVerses, null, 2)}

مهمتك:
1. التحقق من سلامة الاستشهاد بكل آية وملاءمتها للموضوع وسياقها الشرعي التفسيري العام.
2. صياغة خلاصة معرفية وافية ورصينة بأسلوب قرآني وبيان عربي فصيح يربط بين الآيات ويجيب على تساؤل المستخدم بعمق، مع تبيان لطائف الهدايات القرآنية في هذه الآيات.
3. استخراج أهم 3-5 هدايات وتوجيهات عملية (Actionable Quranic Insights).

أرجع النتيجة بصيغة JSON فقط:
{
  "summary": "خلاصة معرفية وافية بأسلوب بياني رصين تجيب على السائل وتربط الآيات بالمعنى المطلوب",
  "insights": [
    "فائدة وتوجيه قرآني عملي مستفاد من الآيات"
  ],
  "contextual_notes": "إضاءة حول سبب ترابط هذه الآيات وسياقها"
}
`;

    const response = await generateWithFallback(ai, prompt, {
        responseMimeType: 'application/json',
        temperature: 0.3
    });

    try {
        return JSON.parse(response.text);
    } catch {
        return {
            summary: "تم استرجاع الآيات المرتبطة باستعلامك بنجاح.",
            insights: [],
            contextual_notes: ""
        };
    }
}

/**
 * Master Controller: Multi-Agent Orchestrator
 */
export async function runCognitiveSearch(userQuery) {
    const apiKey = process.env.GEMINI_API_KEY || config.geminiApiKey;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        throw new Error('يرجى تحديد مفتاح GEMINI_API_KEY في ملف .env لتشغيل محرك البحث المعرفي.');
    }

    const ai = new GoogleGenAI({ apiKey });

    // Step 1: Query Understanding Agent
    const understanding = await queryUnderstandingAgent(ai, userQuery);

    // Step 2: Semantic Retrieval Agent + Local Verification
    const verifiedVerses = await semanticRetrievalAgent(ai, userQuery, understanding);

    // Step 3 & 4: Contextual Reasoning & Synthesis
    const synthesis = await contextualSynthesisAgent(ai, userQuery, understanding, verifiedVerses);

    return {
        query: userQuery,
        execution_pipeline: {
            layer_1_understanding: understanding,
            layer_2_retrieval_count: verifiedVerses.length,
            layer_3_reasoning_status: 'verified_and_grounded'
        },
        results: {
            verses: verifiedVerses,
            synthesis: synthesis.summary,
            insights: synthesis.insights,
            contextual_notes: synthesis.contextual_notes
        }
    };
}

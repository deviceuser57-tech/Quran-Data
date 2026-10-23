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

const FALLBACK_MODELS = [
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.8-flash'
];

async function generateWithFallback(ai, contents, genConfig = {}) {
    let lastError = null;
    for (const model of FALLBACK_MODELS) {
        try {
            return await ai.models.generateContent({
                model,
                contents,
                config: genConfig
            });
        } catch (err) {
            lastError = err;
            if (err.status === 503 || err.status === 404) {
                continue;
            }
            throw err;
        }
    }
    throw lastError;
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
async function morphologicalEngineAgent(ai, userQuery, mode) {
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

    const response = await generateWithFallback(ai, prompt, {
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
async function intraQuranicResonanceAgent(ai, userQuery, morphData) {
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

    const response = await generateWithFallback(ai, prompt, {
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
async function epistemicSynthesisAgent(ai, userQuery, mode, morphData, resonanceData) {
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

    const response = await generateWithFallback(ai, prompt, {
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
    const apiKey = process.env.GEMINI_API_KEY || config.geminiApiKey;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
        throw new Error('يرجى تحديد مفتاح GEMINI_API_KEY في ملف .env لتشغيل محرك البحث المعرفي.');
    }

    const ai = new GoogleGenAI({ apiKey });

    // Step 0: Resolve Research Mode
    const mode = resolveResearchMode(requestedMode, userQuery);

    // Step 1: Deep Morphological & Syntactic Engine
    const morphData = await morphologicalEngineAgent(ai, userQuery, mode);

    // Step 2: Intra-Quranic Resonance & Raw Text Extraction (Tier 0)
    const resonanceData = await intraQuranicResonanceAgent(ai, userQuery, morphData);

    // Step 3 & 4: Epistemic Sourcing, Guard Agent & 5-Nodes Canvas Synthesis
    const synthesis = await epistemicSynthesisAgent(ai, userQuery, mode, morphData, resonanceData);

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

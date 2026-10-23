import { runCognitiveSearch } from '../services/cognitiveSearchService.mjs';

export async function handleCognitiveSearch(req, res) {
    try {
        const query = req.body?.query || req.query?.q;
        const mode = req.body?.mode || req.query?.mode || null;

        if (!query || typeof query !== 'string' || !query.trim()) {
            return res.status(400).json({
                success: false,
                error: 'يرجى تقديم نص البحث (query) في جسم الطلب أو المعامل q.'
            });
        }

        const result = await runCognitiveSearch(query.trim(), mode);

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error('[COGNITIVE-SEARCH-ERROR]:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'حدث خطأ أثناء معالجة البحث المعرفي'
        });
    }
}

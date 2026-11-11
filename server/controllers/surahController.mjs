import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { handleError } from '../utils/errorUtils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// مسارات البيانات
const metadataPath = path.join(__dirname, '..', '..', 'data', 'json', 'metadata.json');
const surahFolderPath = path.join(__dirname, '..', '..', 'data', 'json', 'surah');
const versesFolderPath = path.join(__dirname, '..', '..', 'data', 'json', 'verses');
const audioFolderPath = path.join(__dirname, '..', '..', 'data', 'json', 'audio');
const pagesQuranPath = path.join(__dirname, '..', '..', 'data', 'pagesQuran.json');

const parseOptionalId = (value) => {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const text = String(value);
    if (!/^\d+$/.test(text)) {
        return NaN;
    }

    const parsed = Number(text);
    return Number.isSafeInteger(parsed) ? parsed : NaN;
};

const isAtOrBefore = (leftSurah, leftVerse, rightSurah, rightVerse) =>
    leftSurah < rightSurah || (leftSurah === rightSurah && leftVerse <= rightVerse);


export const getAllSurahs = (req, res) => {
    try {
        const metadata = fs.readJSONSync(metadataPath);
        res.json({
            success: true,
            result: metadata
        });
    } catch (error) {
        handleError(res, 500, 'An error occurred while fetching surah metadata.', {
            message: error.message,
        });
    }
};

export const getAllVerses = (req, res) => {
    try {
        const surahId = req.query.surah_id || req.params.surah_id;
        const surahPath = path.join(surahFolderPath, `surah_${surahId}.json`);

        if (!fs.existsSync(surahPath)) {
            return handleError(res, 404, 'The requested verses do not exist.', {
                surah_id: surahId,
            });
        }

        const surahData = fs.readJSONSync(surahPath);
        res.json({
            success: true,
            result: surahData.verses
        });
    } catch (error) {
        handleError(res, 500, 'An error occurred while fetching verses data.', {
            message: error.message,
        });
    }
};

export const getSurah = (req, res) => {

    const surahId = req.query.surah_id || req.params.surah_id;
    const surahPath = path.join(surahFolderPath, `surah_${surahId}.json`);

    if (!fs.existsSync(surahPath)) {
        return handleError(res, 404, '⚠️ The requested surah does not exist.', {
            surah_id: surahId,
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.originalUrl
        });
    }

    try {
        const surahData = fs.readJSONSync(surahPath);
        res.json({
            success: true,
            result: surahData
        });
    } catch (error) {
        handleError(res, 500, 'An error occurred while fetching surah data.', {
            surah_id: surahId,
            message: error.message,
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.originalUrl
        });
    }
};

export const getVerse = (req, res) => {
    const surahId = req.query.surah_id || req.params.surah_id;
    const verseId = req.query.verse_id || req.params.verse_id;
    const versePath = path.join(versesFolderPath, `${String(surahId).padStart(3, '0')}_${String(verseId).padStart(3, '0')}.json`);

    if (!surahId) {
        return handleError(res, 400, 'surah_id is required.', {
            message: 'Please provide a valid surah_id in the query or params.',
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.originalUrl
        });
    } else if (!verseId) {
        return handleError(res, 400, 'verseId is required.', {
            message: 'Please provide a valid verseId in the query or params.',
            timestamp: new Date().toISOString(),
            method: req.method,
            path: req.originalUrl
        });
    } else {
        // Fetch a specific verse
        if (!fs.existsSync(versePath)) {
            return handleError(res, 404, 'The requested verse does not exist.', {
                surah_id: surahId,
                verse_id: verseId,
                timestamp: new Date().toISOString(),
                method: req.method,
                path: req.originalUrl
            });
        }

        try {
            const verseData = fs.readJSONSync(versePath);
            res.json({
                success: true,
                result: verseData
            });
        } catch (error) {
            handleError(res, 500, 'An error occurred while fetching verse data.', {
                surah_id: surahId,
                verse_id: verseId,
                message: error.message,
                timestamp: new Date().toISOString(),
                method: req.method,
                path: req.originalUrl
            });
        }
    }
};

export const getAudio = (req, res) => {
    const surahId = req.query.surah_id || req.params.surah_id;
    const audioPath = path.join(audioFolderPath, `audio_surah_${surahId}.json`);

    if (!fs.existsSync(audioPath)) {
        return handleError(res, 404, 'The requested audio does not exist.', {
            surah_id: surahId,
        });
    }

    try {
        const audioData = fs.readJSONSync(audioPath);
        res.json({
            success: true,
            result: audioData
        });
    } catch (error) {
        handleError(res, 500, 'An error occurred while fetching audio data.', {
            surah_id: surahId,
            message: error.message,
        });
    }
};

export const getVersesByJuz = (req, res) => {
    const juzId = parseInt(req.query.juz_id || req.params.juz_id, 10);
    const surahFiles = fs.readdirSync(surahFolderPath);

    let allVerses = [];

    try {
        for (const file of surahFiles) {
            const filePath = path.join(surahFolderPath, file);
            const surahData = fs.readJSONSync(filePath);

            if (surahData.verses) {
                const verses = surahData.verses.filter(verse => verse.juz === juzId)
                    .map(verse => ({
                        ...verse,
                        surahName: surahData.name.ar,
                        surahNumber: surahData.number
                    }));

                allVerses = allVerses.concat(verses);
            }
        }

        if (allVerses.length === 0) {
            return handleError(res, 404, 'No verses found for the specified juz.', { juzId });
        }

        res.json({
            success: true,
            result: allVerses
        });
    } catch (error) {
        handleError(res, 500, 'An error occurred while fetching verses by juz.', {
            juz_id: juzId,
            message: error.message,
        });
    }
};

export const getSajdaVerses = (req, res) => {
    const surahFiles = fs.readdirSync(surahFolderPath);
    let sajdaVerses = [];

    try {
        for (const file of surahFiles) {
            const filePath = path.join(surahFolderPath, file);
            const surahData = fs.readJSONSync(filePath);

            if (surahData.verses) {
                const verses = surahData.verses.filter(verse => verse.sajda)
                    .map(verse => ({
                        ...verse,
                        surahName: surahData.name.ar,
                        surahNumber: surahData.number
                    }));

                sajdaVerses = sajdaVerses.concat(verses);
            }
        }

        if (sajdaVerses.length === 0) {
            return handleError(res, 404, 'No verses with sajda found.', {});
        }

        res.json({
            success: true,
            result: sajdaVerses
        });
    } catch (error) {
        handleError(res, 500, 'An error occurred while fetching sajda verses.', {
            message: error.message,
        });
    }
};


export const getPage = (req, res) => {
    try {
        const surahId = parseOptionalId(req.query.surah_id || req.params.surah_id);
        const verseId = parseOptionalId(req.query.verse_id || req.params.verse_id);
        const page = parseOptionalId(req.query.page);

        if ([surahId, verseId, page].some(value => Number.isNaN(value))) {
            return handleError(res, 400, 'Page lookup parameters must be positive integers.', {});
        }

        if (page !== null && (page < 1 || page > 604)) {
            return handleError(res, 400, 'page must be between 1 and 604.', { page });
        }

        if (surahId === null && page === null) {
            return handleError(res, 400, 'Provide a page or surah_id to look up Quran pages.', {});
        }

        if (verseId !== null && surahId === null) {
            return handleError(res, 400, 'surah_id is required when verse_id is provided.', { verse_id: verseId });
        }

        if (surahId !== null && (surahId < 1 || surahId > 114)) {
            return handleError(res, 400, 'surah_id must be between 1 and 114.', { surah_id: surahId });
        }

        const pagesData = fs.readJSONSync(pagesQuranPath);
        let result = [];

        if (page) {
            result = pagesData.filter(p => p.page === page);
        } else if (surahId && verseId) {
            const metadata = fs.readJSONSync(metadataPath);
            const surah = metadata.find(item => item.number === surahId);
            if (!surah || verseId < 1 || verseId > surah.verses_count) {
                return handleError(res, 400, 'verse_id is outside the requested surah.', {
                    surah_id: surahId,
                    verse_id: verseId,
                });
            }

            result = pagesData.filter(p =>
                isAtOrBefore(p.start.surah_number, p.start.verse, surahId, verseId) &&
                isAtOrBefore(surahId, verseId, p.end.surah_number, p.end.verse)
            );
        } else if (surahId) {
            result = pagesData.filter(p =>
                isAtOrBefore(p.start.surah_number, p.start.verse, surahId, Number.MAX_SAFE_INTEGER) &&
                isAtOrBefore(surahId, 1, p.end.surah_number, p.end.verse)
            );
        }

        if (result.length === 0) {
            return handleError(res, 404, 'No pages found for the given query.', {
                surah_id: surahId,
                verse_id: verseId,
                page: page,
            });
        }

        const imageBaseUrl = '/data/quran_image';
        const enrichedResult = result.map(item => ({
            ...item,
            image: {
                url: `${imageBaseUrl}/${item.page}.png`,
            },
        }));

        res.json({
            success: true,
            result: enrichedResult
        });
    } catch (error) {
        handleError(res, 500, 'An error occurred while fetching page data.', {
            message: error.message,
        });
    }
};
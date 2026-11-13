// utils/errorHandler.js
import { handleError } from './errorUtils.mjs';

export default (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    const errorStatus = err && (Number.isInteger(err.status) ? err.status : err.statusCode);
    const statusCode = Number.isInteger(errorStatus) && errorStatus >= 400 && errorStatus < 500
        ? errorStatus
        : 500;
    const malformedJson = err && err.type === 'entity.parse.failed';

    if (statusCode >= 500) {
        const name = err && typeof err.name === 'string' ? err.name : 'UnknownError';
        const code = err && typeof err.code === 'string' ? err.code : undefined;
        console.error('[HTTP-ERROR]:', { name, code });
    }

    const errorMessage = statusCode >= 500
        ? 'Server Error.'
        : malformedJson
            ? 'Invalid JSON payload.'
            : 'Invalid request.';
    const message = statusCode >= 500
        ? 'An unexpected error occurred. Please try again later.'
        : malformedJson
            ? 'The request body must contain valid JSON.'
            : 'The request could not be processed.';

    return handleError(res, statusCode, errorMessage, { message });
};

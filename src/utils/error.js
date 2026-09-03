/**
 * Extracts and formats error messages from API response / exceptions.
 * Safely handles strings, FastAPI 422 validation error arrays, and generic error objects.
 */
export function formatErrorMessage(err, fallback = 'Terjadi kesalahan. Silakan coba lagi.') {
  if (!err) return fallback;

  // Axios response error details
  const detail = err.response?.data?.detail ?? err.response?.data?.message ?? err.message;

  if (!detail) {
    return fallback;
  }

  // Already a string
  if (typeof detail === 'string') {
    return detail;
  }

  // Array of Pydantic validation error objects: [{ loc: ['body', 'field'], msg: '...', type: '...' }]
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const loc = Array.isArray(item.loc)
            ? item.loc.filter((x) => x !== 'body').join('.')
            : '';
          let msg = item.msg || JSON.stringify(item);

          // Translate common pydantic messages if English
          if (msg.includes('at least 6 characters')) {
            msg = 'Password minimal 6 karakter';
          } else if (msg.includes('value is not a valid email address')) {
            msg = 'Format email tidak valid';
          } else if (msg.includes('Field required')) {
            msg = 'Field wajib diisi';
          }

          return loc ? `${loc}: ${msg}` : msg;
        }
        return String(item);
      })
      .join('\n');
  }

  // Single object error
  if (typeof detail === 'object') {
    return detail.msg || detail.message || JSON.stringify(detail);
  }

  return String(detail);
}

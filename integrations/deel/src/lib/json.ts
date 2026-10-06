import { ServiceError } from '@lowerdeck/error';
import { createApiServiceError } from 'slates';

let decimalValue = (source: string) => {
  let [coefficient = '', exponent = '0'] = source.toLowerCase().split('e');
  let negative = coefficient.startsWith('-');
  let unsigned = negative ? coefficient.slice(1) : coefficient;
  let [whole = '', fraction = ''] = unsigned.split('.');
  let digits = (whole + fraction).replace(/^0+/, '') || '0';
  let scale = Number(exponent) - fraction.length;
  while (digits.endsWith('0') && digits !== '0') {
    digits = digits.slice(0, -1);
    scale++;
  }
  return { digits, scale: digits === '0' ? 0 : scale, negative: negative && digits !== '0' };
};
let decimalKey = (source: string) => {
  let v = decimalValue(source);
  return `${v.negative ? '-' : ''}${v.digits}e${v.digits === '0' ? 0 : v.scale}`;
};
// Deel mixes legacy int64 IDs with string IDs and numbers with decimal-string amounts.
// Preserve only numeric identifiers that would otherwise round; reject semantic loss in money.
export let parseDeelResponse = (body: unknown): unknown => {
  if (typeof body !== 'string') return body;
  if (!body.trim()) return undefined;
  try {
    let tokens = body.matchAll(
      /"(?:\\.|[^"\\])*"|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}[\]:,]|true|false|null/g
    );
    let previous = '',
      key = '';
    let parts: string[] = [];
    let end = 0;
    for (let match of tokens) {
      let token = match[0],
        index = match.index;
      if (token === ':' && previous.startsWith('"')) key = JSON.parse(previous);
      else if (token !== ':' && key) {
        if (/^-?\d/.test(token)) {
          let number = Number(token);
          if (key === 'id' || key.endsWith('_id')) {
            let value = decimalValue(token);
            if (value.scale < 0 || !Number.isFinite(value.scale) || value.scale > 10000)
              throw createApiServiceError('Deel returned an invalid numeric identifier.', {
                reason: 'deel_response'
              });
            if (!Number.isSafeInteger(number)) {
              parts.push(
                body.slice(end, index),
                JSON.stringify(
                  (value.negative ? '-' : '') + value.digits + '0'.repeat(value.scale)
                )
              );
              end = index + token.length;
            }
          } else if (
            [
              'amount',
              'rate',
              'salary',
              'first_payment',
              'total_amount',
              'deduction_amount'
            ].includes(key) &&
            (!Number.isFinite(number) || decimalKey(token) !== decimalKey(String(number)))
          )
            throw createApiServiceError(
              'Deel returned a monetary number that cannot be represented without rounding.',
              { reason: 'deel_precision' }
            );
        }
        key = '';
      }
      previous = token;
    }
    parts.push(body.slice(end));
    return JSON.parse(parts.join(''));
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw createApiServiceError('Deel returned invalid JSON.', { reason: 'deel_response' });
  }
};

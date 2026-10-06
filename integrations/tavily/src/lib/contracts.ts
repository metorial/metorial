import { ServiceError } from '@lowerdeck/error';
import { AuthConfigSecretRedactor, buildApiServiceError, createApiServiceError } from 'slates';
import { z } from 'zod';

export { z };
export const MAX_BYTES = 8 * 1024 * 1024;
export function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw createApiServiceError(message);
}
export function credential(value: unknown): asserts value is string {
  requireValue(
    typeof value === 'string' &&
      value.length > 0 &&
      value.length <= 4096 &&
      [...value].every(c => c.charCodeAt(0) >= 33 && c.charCodeAt(0) <= 126),
    'Provide a nonempty Tavily API key without whitespace.'
  );
}
export function requestId(value: unknown): asserts value is string {
  requireValue(
    typeof value === 'string' &&
      value.length > 0 &&
      value.length <= 1024 &&
      value !== '.' &&
      value !== '..' &&
      value.isWellFormed() &&
      [...value].every(
        c => c.charCodeAt(0) >= 33 && c.charCodeAt(0) !== 127 && !'/\\?#'.includes(c)
      ),
    'Use the exact research request ID returned by Tavily.'
  );
}
export function safeJson(value: unknown, secrets: readonly string[]) {
  let serialized: string;
  try {
    serialized = JSON.stringify(value);
  } catch {
    throw createApiServiceError('Tavily returned invalid JSON.');
  }
  requireValue(
    typeof serialized === 'string' && Buffer.byteLength(serialized) <= MAX_BYTES,
    'Tavily data is invalid or exceeds the 8 MiB limit.'
  );
  const variants = new Set<string>();
  for (const secret of secrets.filter(Boolean)) {
    variants.add(secret);
    variants.add(
      [...secret].map(c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).join('')
    );
    let uri = secret,
      base64 = secret,
      url64 = secret;
    for (let i = 0; i < 4; i++) {
      uri = encodeURIComponent(uri);
      base64 = Buffer.from(base64).toString('base64');
      url64 = Buffer.from(url64).toString('base64url');
      for (const v of [uri, base64, url64]) variants.add(v);
    }
  }
  const redactor = new AuthConfigSecretRedactor({ variants: [...variants] });
  const strings = [serialized];
  const visit = (v: unknown) => {
    if (typeof v === 'string') strings.push(v);
    else if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === 'object')
      for (const [k, item] of Object.entries(v)) {
        strings.push(k);
        visit(item);
      }
  };
  visit(value);
  for (const original of strings) {
    const candidates = [original];
    for (let i = 0; i < 2; i++)
      for (const text of [...candidates]) {
        try {
          candidates.push(decodeURIComponent(text));
        } catch {
          /* Plain text is valid. */
        }
        candidates.push(
          text.replace(/\\u([a-fA-F0-9]{4})/g, (_, n: string) =>
            String.fromCharCode(Number.parseInt(n, 16))
          )
        );
        for (const segment of text.match(/[A-Za-z0-9+/_=-]{8,16384}/g) ?? [])
          candidates.push(Buffer.from(segment, 'base64').toString('utf8'));
      }
    requireValue(
      !candidates.some(text => redactor.redactEmbedded(text) !== text),
      'Tavily returned credential-bearing data; the result cannot be exposed.'
    );
  }
}
export function upstream(error: unknown) {
  if (error instanceof ServiceError) return error;
  return buildApiServiceError(error, {
    providerLabel: 'Tavily',
    parent: {},
    reason: 'Check the API key, project scope, credit budget and request parameters.',
    formatMessage: c =>
      `Tavily request failed${c.status ? ` (HTTP ${c.status})` : ''}. Check credentials, permissions and available credits.`
  });
}
const countries = new Set([
  'afghanistan',
  'albania',
  'algeria',
  'andorra',
  'angola',
  'argentina',
  'armenia',
  'australia',
  'austria',
  'azerbaijan',
  'bahamas',
  'bahrain',
  'bangladesh',
  'barbados',
  'belarus',
  'belgium',
  'belize',
  'benin',
  'bhutan',
  'bolivia',
  'bosnia and herzegovina',
  'botswana',
  'brazil',
  'brunei',
  'bulgaria',
  'burkina faso',
  'burundi',
  'cambodia',
  'cameroon',
  'canada',
  'cape verde',
  'central african republic',
  'chad',
  'chile',
  'china',
  'colombia',
  'comoros',
  'congo',
  'costa rica',
  'croatia',
  'cuba',
  'cyprus',
  'czech republic',
  'denmark',
  'djibouti',
  'dominican republic',
  'ecuador',
  'egypt',
  'el salvador',
  'equatorial guinea',
  'eritrea',
  'estonia',
  'ethiopia',
  'fiji',
  'finland',
  'france',
  'gabon',
  'gambia',
  'georgia',
  'germany',
  'ghana',
  'greece',
  'guatemala',
  'guinea',
  'haiti',
  'honduras',
  'hungary',
  'iceland',
  'india',
  'indonesia',
  'iran',
  'iraq',
  'ireland',
  'israel',
  'italy',
  'jamaica',
  'japan',
  'jordan',
  'kazakhstan',
  'kenya',
  'kuwait',
  'kyrgyzstan',
  'latvia',
  'lebanon',
  'lesotho',
  'liberia',
  'libya',
  'liechtenstein',
  'lithuania',
  'luxembourg',
  'madagascar',
  'malawi',
  'malaysia',
  'maldives',
  'mali',
  'malta',
  'mauritania',
  'mauritius',
  'mexico',
  'moldova',
  'monaco',
  'mongolia',
  'montenegro',
  'morocco',
  'mozambique',
  'myanmar',
  'namibia',
  'nepal',
  'netherlands',
  'new zealand',
  'nicaragua',
  'niger',
  'nigeria',
  'north korea',
  'north macedonia',
  'norway',
  'oman',
  'pakistan',
  'panama',
  'papua new guinea',
  'paraguay',
  'peru',
  'philippines',
  'poland',
  'portugal',
  'qatar',
  'romania',
  'russia',
  'rwanda',
  'saudi arabia',
  'senegal',
  'serbia',
  'singapore',
  'slovakia',
  'slovenia',
  'somalia',
  'south africa',
  'south korea',
  'south sudan',
  'spain',
  'sri lanka',
  'sudan',
  'sweden',
  'switzerland',
  'syria',
  'taiwan',
  'tajikistan',
  'tanzania',
  'thailand',
  'togo',
  'trinidad and tobago',
  'tunisia',
  'turkey',
  'turkmenistan',
  'uganda',
  'ukraine',
  'united arab emirates',
  'united kingdom',
  'united states',
  'uruguay',
  'uzbekistan',
  'venezuela',
  'vietnam',
  'yemen',
  'zambia',
  'zimbabwe'
]);
export function validateInput(key: string, input: Record<string, unknown>, token: string) {
  safeJson(input, [token]);
  for (const name of ['query', 'input', 'url'])
    if (input[name] !== undefined)
      requireValue(
        typeof input[name] === 'string' && (input[name] as string).trim().length > 0,
        `Provide a nonempty ${name}.`
      );
  for (const [name, min, max] of [
    ['maxResults', 0, 20],
    ['chunksPerSource', 1, key === 'web_search' ? 3 : 5],
    ['maxDepth', 1, 5],
    ['maxBreadth', 1, 500],
    ['limit', 1, Number.MAX_SAFE_INTEGER]
  ] as const)
    if (input[name] !== undefined)
      requireValue(
        Number.isSafeInteger(input[name]) &&
          Number(input[name]) >= min &&
          Number(input[name]) <= max,
        `${name} requires an integer between ${min} and ${max}.`
      );
  if (input.chunksPerSource !== undefined) {
    requireValue(
      key !== 'web_search' || input.searchDepth !== 'ultra-fast',
      'Chunks per source is supported with basic, fast or advanced search depth.'
    );
    requireValue(
      key !== 'extract_content' ||
        (typeof input.query === 'string' && input.query.trim().length > 0),
      'Provide a query when selecting extraction chunks.'
    );
    requireValue(
      key !== 'crawl_website' ||
        (typeof input.instructions === 'string' && input.instructions.trim().length > 0),
      'Provide instructions when selecting crawl chunks.'
    );
  }
  if (input.country !== undefined)
    requireValue(
      countries.has(input.country as string) &&
        (input.topic === undefined || input.topic === 'general'),
      'Use a documented lowercase country name, such as united states, with general topic.'
    );
  for (const [field, max] of [
    ['includeDomains', 300],
    ['excludeDomains', key === 'web_search' ? 150 : Number.MAX_SAFE_INTEGER]
  ] as const)
    if (input[field] !== undefined)
      requireValue(
        Array.isArray(input[field]) && (input[field] as unknown[]).length <= max,
        `${field} exceeds its native limit.`
      );
  for (const field of ['startDate', 'endDate'])
    if (input[field] !== undefined) {
      const date = input[field] as string;
      requireValue(
        /^\d{4}-\d{2}-\d{2}$/.test(date) &&
          Number.isFinite(Date.parse(date)) &&
          new Date(date).toISOString().slice(0, 10) === date,
        'Use a valid YYYY-MM-DD date.'
      );
    }
  requireValue(
    input.startDate === undefined ||
      input.endDate === undefined ||
      String(input.startDate) <= String(input.endDate),
    'startDate must not follow endDate.'
  );
  if (input.outputSchema !== undefined) {
    const schema = input.outputSchema as Record<string, unknown>;
    requireValue(
      schema.properties &&
        typeof schema.properties === 'object' &&
        !Array.isArray(schema.properties),
      'Research outputSchema must include a properties object.'
    );
  }
}

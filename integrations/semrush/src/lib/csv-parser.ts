import { createApiServiceError } from 'slates';

/** Parse Semrush's semicolon-delimited reports, including escaped and multiline fields. */
export let parseCsvResponse = (data: string): Record<string, unknown>[] => {
  if (typeof data !== 'string') {
    throw createApiServiceError('Semrush returned an invalid CSV report.');
  }
  let trimmed = data.trim();
  if (!trimmed) return [];
  let apiError = /^ERROR\s+(\d+)\s*::\s*([\s\S]*)$/.exec(trimmed);
  if (trimmed.startsWith('ERROR')) {
    throw createApiServiceError(`Semrush API error: ${apiError?.[2] || trimmed}`, {
      reason: 'upstream_api_error',
      upstreamCode: apiError?.[1]
    });
  }

  let rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < trimmed.length; i++) {
    let char = trimmed[i]!;
    if (char === '"') {
      if (quoted && trimmed[i + 1] === '"') {
        value += '"';
        i++;
      } else if (quoted || !value.trim()) {
        quoted = !quoted;
      } else {
        value += char;
      }
    } else if (char === ';' && !quoted) {
      row.push(value.trim());
      value = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      row.push(value.trim());
      if (row.some(cell => cell !== '')) rows.push(row);
      row = [];
      value = '';
      if (char === '\r' && trimmed[i + 1] === '\n') i++;
    } else {
      value += char;
    }
  }
  if (quoted)
    throw createApiServiceError(
      'Semrush returned a CSV report with an unclosed quoted field.'
    );
  row.push(value.trim());
  if (row.some(cell => cell !== '')) rows.push(row);
  let headers = rows.shift();
  if (!headers) return [];
  return rows.map(values =>
    Object.fromEntries(headers.map((header, i) => [header, parseValue(values[i] ?? '')]))
  );
};

let parseValue = (value: string): unknown => {
  if (value === '' || value === '--') {
    return null;
  }
  if (value === 'true') return true;
  if (value === 'false') return false;

  let num = Number(value);
  if (!Number.isNaN(num) && value !== '') {
    return num;
  }
  return value;
};

/**
 * Mapping of Semrush column codes to human-readable names
 */
export let columnNameMap: Record<string, string> = {
  // Domain report columns
  Db: 'database',
  Dn: 'domain',
  Rk: 'rank',
  Or: 'organicKeywords',
  Ot: 'organicTraffic',
  Oc: 'organicCost',
  Ad: 'adwordsKeywords',
  At: 'adwordsTraffic',
  Ac: 'adwordsCost',
  Sh: 'semrushRank',
  Sv: 'semrushVisits',
  Dt: 'date',
  Cr: 'competitionLevel',
  Np: 'commonKeywords',

  // Keyword report columns
  Ph: 'keyword',
  Nq: 'searchVolume',
  Cp: 'cpc',
  Co: 'competition',
  Nr: 'numberOfResults',
  Td: 'trend',
  In: 'intent',
  Kd: 'keywordDifficulty',
  Rr: 'relatedRelevance',

  // Position columns
  Po: 'position',
  Pp: 'previousPosition',
  Pd: 'positionDifference',
  Ur: 'url',
  Tr: 'traffic',
  Tc: 'trafficCost',

  // Keyword SERP columns
  Fk: 'featuredSnippetKeyword',
  Fp: 'featuredSnippetPosition',

  // Ad columns
  Tt: 'title',
  Ds: 'description',
  Vu: 'visibleUrl',

  // Position columns for domain comparison
  P0: 'position0',
  P1: 'position1',
  P2: 'position2',
  P3: 'position3',
  P4: 'position4'
};

/**
 * Transforms a record using the column name mapping for more readable output
 */
export let transformColumnNames = (row: Record<string, unknown>): Record<string, unknown> => {
  let transformed: Record<string, unknown> = {};
  for (let [key, value] of Object.entries(row)) {
    let newKey = columnNameMap[key] || key;
    transformed[newKey] = value;
  }
  return transformed;
};

/**
 * Transforms an array of records using the column name mapping
 */
export let transformResults = (rows: Record<string, unknown>[]): Record<string, unknown>[] => {
  return rows.map(transformColumnNames);
};

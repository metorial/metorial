/**
 * Parses Semrush's semicolon-delimited CSV response format.
 * The first line contains column headers, subsequent lines contain data.
 * Returns an array of objects with header keys mapped to values.
 */
export let parseCsvResponse = (data: string): Record<string, unknown>[] => {
  if (!data || typeof data !== 'string') {
    return [];
  }

  let trimmed = data.trim();
  if (!trimmed || trimmed.startsWith('ERROR')) {
    throw new Error(`Semrush API error: ${trimmed}`);
  }

  let lines = trimmed.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) {
    return [];
  }

  let headers = lines[0]!.split(';').map(h => h.trim());
  let results: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    let values = lines[i]!.split(';');
    let row: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      let header = headers[j]!;
      let value = values[j]?.trim() ?? '';
      row[header] = parseValue(value);
    }
    results.push(row);
  }

  return results;
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

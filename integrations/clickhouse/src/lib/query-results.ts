let isRecord = (value: unknown): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let parseJson = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

let parseJsonLines = (raw: string) => {
  let lines = raw
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return undefined;

  let rows: unknown[] = [];

  for (let line of lines) {
    let parsed = parseJson(line);
    if (parsed === undefined) return undefined;
    rows.push(parsed);
  }

  return rows;
};

export type ClickHouseQueryResult = {
  raw: string;
  parsed?: unknown;
  rows?: unknown[];
  columns?: unknown[];
  rowCount?: number;
  statistics?: Record<string, any>;
  format?: string;
};

export let parseClickHouseResponse = (raw: string, format?: string): ClickHouseQueryResult => {
  let trimmed = raw.trim();
  let parsed = trimmed ? parseJson(trimmed) : undefined;
  let result: ClickHouseQueryResult = { raw };

  if (parsed !== undefined) {
    result.parsed = parsed;

    if (isRecord(parsed.data) && Array.isArray(parsed.data.rows)) {
      result.rows = parsed.data.rows;
      result.columns = Array.isArray(parsed.data.columns) ? parsed.data.columns : undefined;
      result.rowCount = parsed.data.rows.length;
      return result;
    }

    if (Array.isArray(parsed.data)) {
      result.rows = parsed.data;
      result.columns = Array.isArray(parsed.meta) ? parsed.meta : undefined;
      result.rowCount = typeof parsed.rows === 'number' ? parsed.rows : parsed.data.length;
      result.statistics = isRecord(parsed.statistics) ? parsed.statistics : undefined;
      return result;
    }

    if (Array.isArray(parsed)) {
      result.rows = parsed;
      result.rowCount = parsed.length;
      return result;
    }

    return result;
  }

  let jsonLines = parseJsonLines(trimmed);
  if (jsonLines) {
    result.rows = jsonLines;
    result.rowCount = jsonLines.length;
    result.format = format;
  }

  return result;
};

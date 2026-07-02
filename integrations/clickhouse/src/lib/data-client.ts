import { ServiceError } from '@lowerdeck/error';
import { clickhouseApiError, clickhouseServiceError } from './errors';
import { parseClickHouseResponse } from './query-results';

let identifierPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;

let parseMaybeJson = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

let normalizeEndpoint = (endpoint: string) => {
  let value = endpoint.trim();
  if (!value) {
    throw clickhouseServiceError('ClickHouse HTTP endpoint is required.');
  }

  if (!/^https?:\/\//i.test(value)) {
    value = `https://${value}`;
  }

  try {
    let url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw clickhouseServiceError('ClickHouse HTTP endpoint must use http or https.');
    }

    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = '';

    return url.toString();
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw clickhouseServiceError('ClickHouse HTTP endpoint must be a valid URL or host.');
  }
};

export let validateIdentifier = (identifier: string, label = 'identifier') => {
  let value = identifier.trim();

  if (!identifierPattern.test(value)) {
    throw clickhouseServiceError(
      `Invalid ${label}. Use an unquoted ClickHouse identifier with letters, numbers, and underscores, starting with a letter or underscore.`
    );
  }

  return value;
};

export let qualifiedTableName = (table: string, database?: string) => {
  let tableName = `\`${validateIdentifier(table, 'table name')}\``;

  if (!database) return tableName;

  return `\`${validateIdentifier(database, 'database name')}\`.${tableName}`;
};

let stripLeadingSqlComments = (sql: string) => {
  let value = sql.trimStart();

  while (value.startsWith('--') || value.startsWith('/*')) {
    if (value.startsWith('--')) {
      let nextLine = value.indexOf('\n');
      value = nextLine === -1 ? '' : value.slice(nextLine + 1).trimStart();
      continue;
    }

    let end = value.indexOf('*/');
    value = end === -1 ? '' : value.slice(end + 2).trimStart();
  }

  return value;
};

export let assertReadOnlySql = (sql: string) => {
  let trimmed = stripLeadingSqlComments(sql);

  if (!trimmed) {
    throw clickhouseServiceError('SQL query cannot be empty.');
  }

  if (/;[\s\S]*\S/.test(trimmed)) {
    throw clickhouseServiceError('Only one SQL statement can be executed at a time.');
  }

  let firstKeyword = trimmed.match(/^([a-z]+)/i)?.[1]?.toLowerCase();
  let allowedKeywords = new Set(['select', 'show', 'describe', 'desc', 'explain']);

  if (!firstKeyword || !allowedKeywords.has(firstKeyword)) {
    throw clickhouseServiceError(
      'execute_query only allows read-only SELECT, SHOW, DESCRIBE, DESC, or EXPLAIN statements. Use insert_rows for inserts.'
    );
  }
};

export let assertRows = (rows: Record<string, unknown>[]) => {
  if (rows.length === 0) {
    throw clickhouseServiceError('At least one row is required.');
  }

  for (let [index, row] of rows.entries()) {
    if (
      typeof row !== 'object' ||
      row === null ||
      Array.isArray(row) ||
      Object.keys(row).length === 0
    ) {
      throw clickhouseServiceError(`Row ${index + 1} must be a non-empty object.`);
    }
  }
};

type QueryOptions = {
  database?: string;
  format?: string;
  maxRows?: number;
  params?: Record<string, string | number | boolean | undefined>;
};

export class ClickHouseDataClient {
  private endpoint: string;
  private authHeader: string;

  constructor(params: { endpoint: string; username: string; password: string }) {
    this.endpoint = normalizeEndpoint(params.endpoint);
    this.authHeader = `Basic ${Buffer.from(`${params.username}:${params.password}`).toString(
      'base64'
    )}`;
  }

  private buildUrl(params: Record<string, string | number | boolean | undefined>) {
    let url = new URL(this.endpoint);

    for (let [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    return url;
  }

  private async post(params: {
    operation: string;
    body: string;
    urlParams: Record<string, string | number | boolean | undefined>;
    format?: string;
  }) {
    try {
      let res = await fetch(this.buildUrl(params.urlParams), {
        method: 'POST',
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'text/plain; charset=utf-8'
        },
        body: params.body
      });
      let raw = await res.text();

      if (!res.ok) {
        throw clickhouseApiError(
          {
            response: {
              status: res.status,
              statusText: res.statusText,
              data: parseMaybeJson(raw)
            }
          },
          params.operation
        );
      }

      return parseClickHouseResponse(raw, params.format);
    } catch (error) {
      throw clickhouseApiError(error, params.operation);
    }
  }

  async query(sql: string, options: QueryOptions = {}) {
    let format = options.format || 'JSON';
    let urlParams: Record<string, string | number | boolean | undefined> = {
      database: options.database,
      default_format: format,
      max_result_rows: options.maxRows,
      result_overflow_mode: options.maxRows ? 'break' : undefined,
      ...options.params
    };

    return this.post({
      operation: 'data query',
      body: sql,
      urlParams,
      format
    });
  }

  async insertJsonEachRow(params: {
    database?: string;
    table: string;
    rows: Record<string, unknown>[];
  }) {
    let tableName = qualifiedTableName(params.table, params.database);
    let rows = params.rows.map(row => JSON.stringify(row)).join('\n');

    await this.post({
      operation: 'insert rows',
      body: `${rows}\n`,
      urlParams: {
        query: `INSERT INTO ${tableName} FORMAT JSONEachRow`,
        database: params.database
      },
      format: 'JSONEachRow'
    });

    return {
      insertedRows: params.rows.length,
      table: tableName
    };
  }
}

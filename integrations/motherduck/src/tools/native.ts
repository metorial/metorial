import { createApiServiceError } from 'slates';
import type { MotherDuckClient, MotherDuckQueryResult } from '../lib/client';

type Input = Record<string, any>;
type Row = Record<string, any>;

const DEFAULT_LIMIT = 100;
const DIVE_APP_URL = 'https://app.motherduck.com/dives/';
// MD_LIST_FLIGHT_RUNS exposes no offset argument, so run history cannot be paged past this.
const FLIGHT_RUN_FETCH_LIMIT = 500;
const PAGE_SIZE = 500;
// A page that never shrinks (an ignored or clamped offset) would otherwise loop forever and
// grow the row buffer without bound.
const MAX_PAGES = 20;
const QUERY_ROW_LIMIT = 2_048;
const QUERY_CHARACTER_LIMIT = 50_000;
const SEARCH_RESULT_LIMIT = 100;
const searchResultLimits: Record<string, number> = {
  share: 10,
  column: 40,
  table: 30,
  schema: 20,
  database: 20
};
const invocationNotice = Symbol('motherduckInvocationNotice');

let withInvocationNotice = (output: Row, notice?: string) => {
  if (notice) Object.defineProperty(output, invocationNotice, { value: notice });
  return output;
};

export let getMotherDuckInvocationNotice = (output: Row) =>
  Reflect.get(output, invocationNotice) as string | undefined;

class SqlParameters {
  values: unknown[] = [];

  add(value: unknown, cast = 'VARCHAR') {
    this.values.push(value);
    return `$${this.values.length}::${cast}`;
  }

  json(value: unknown, cast: string) {
    return `CAST(${this.add(JSON.stringify(value), 'JSON')} AS ${cast})`;
  }

  // DuckDB named-argument table functions reject PostgreSQL bind parameters, so values are
  // inlined instead. DuckDB string literals treat only '' as an escape, which makes quote
  // doubling sufficient; callers must pass scalars or JSON built by `json()`.
  inline(query: string) {
    return query.replace(/\$(\d+)\b/g, (_placeholder, rawIndex: string) => {
      let value = this.values[Number(rawIndex) - 1];
      if (value === null || value === undefined) return 'NULL';
      if (value instanceof Date) value = value.toISOString();
      return `'${String(value).replace(/'/g, "''")}'`;
    });
  }
}

let scalar = (value: unknown) => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return Number(value);
  return value;
};

let parseNested = (value: unknown): any => {
  if (Array.isArray(value)) return value.map(parseNested);
  if (value && typeof value === 'object') {
    if (value instanceof Date) return value.toISOString();
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        parseNested(nested)
      ])
    );
  }
  return scalar(value);
};

let parseJson = (value: unknown): any => {
  if (typeof value === 'string' && /^[[{]/.test(value.trim())) {
    try {
      return parseNested(JSON.parse(value));
    } catch {
      return value;
    }
  }
  return parseNested(value);
};

let normalizeRow = (row: Row): Row =>
  Object.fromEntries(Object.entries(row).map(([key, value]) => [key, parseNested(value)]));

let number = (value: unknown, fallback = 0) => {
  let result = Number(value);
  return Number.isFinite(result) ? result : fallback;
};

let boolean = (value: unknown) =>
  value === true || value === 'true' || value === 't' || value === 1 || value === '1';

let text = (value: unknown, fallback = '') =>
  value === null || value === undefined ? fallback : String(value);

// Slicing raw bytes can split a multi-byte UTF-8 character, so skip any continuation bytes
// left at the head of the tail before decoding.
let tailBytes = (value: string, maxBytes: number) => {
  let buffer = Buffer.from(value);
  let start = Math.max(buffer.length - maxBytes, 0);
  while (start < buffer.length && (buffer[start]! & 0xc0) === 0x80) start += 1;
  return buffer.subarray(start).toString();
};

let optional = (name: string, value: unknown, sql: SqlParameters, cast = 'VARCHAR') =>
  value === undefined ? undefined : `${name} := ${sql.add(value, cast)}`;

let optionalJson = (name: string, value: unknown, sql: SqlParameters, cast: string) =>
  value === undefined ? undefined : `${name} := ${sql.json(value, cast)}`;

let functionQuery = async (
  client: MotherDuckClient,
  name: string,
  args: Array<string | undefined>,
  parameters: SqlParameters,
  database = 'md:'
) => {
  let invocation = `SELECT * FROM ${name}(${args.filter(Boolean).join(', ')})`;
  let result = await client.query(
    parameters.inline(
      `SELECT to_json(result_row) AS result FROM (${invocation}) AS result_row`
    ),
    [],
    database
  );
  return result.rows.map(row => normalizeRow(parseJson(row.result)));
};

let procedureQuery = async (
  client: MotherDuckClient,
  name: string,
  args: Array<string | undefined>,
  parameters: SqlParameters,
  database = 'md:'
) => {
  let result = await client.query(
    parameters.inline(`CALL ${name}(${args.filter(Boolean).join(', ')})`),
    [],
    database
  );
  return result.rows.map(normalizeRow);
};

let applyEdits = (
  original: string,
  edits: Array<{ old_string: string; new_string: string; replace_all?: boolean }>
) => {
  let current = original;
  let replacements = 0;
  for (let edit of edits) {
    let matches = current.split(edit.old_string).length - 1;
    if (matches === 0) {
      throw createApiServiceError(
        `Could not apply an edit because old_string was not found: ${edit.old_string}`,
        { reason: 'motherduck_edit_text_not_found' }
      );
    }
    if (!edit.replace_all && matches > 1) {
      throw createApiServiceError(
        `old_string matched ${matches} locations. Set replace_all to true or provide more context.`,
        { reason: 'motherduck_edit_text_ambiguous' }
      );
    }
    if (edit.replace_all) {
      current = current.split(edit.old_string).join(edit.new_string);
      replacements += matches;
    } else {
      current = current.replace(edit.old_string, edit.new_string);
      replacements += 1;
    }
  }
  return { content: current, replacements };
};

let mapInBatches = async <InputValue, OutputValue>(
  values: InputValue[],
  batchSize: number,
  mapper: (value: InputValue) => Promise<OutputValue>
) => {
  let output: OutputValue[] = [];
  for (let index = 0; index < values.length; index += batchSize) {
    output.push(...(await Promise.all(values.slice(index, index + batchSize).map(mapper))));
  }
  return output;
};

// Blanks every literal, quoted identifier, and comment so the checks below only see live
// SQL. A regex cannot do this: block comments nest, so their end must be found by tracking
// depth, and a single-pass alternation that stops at the first `*/` resumes scanning inside
// comment text where a stray quote or `--` can then swallow a trailing `; DROP ...`. The
// simple query protocol executes such a batch, so anything the scanner cannot model exactly
// is rejected rather than blanked.
let scanReadOnlySql = (sql: string) => {
  let scrubbed = '';
  let index = 0;
  let reject = (invalid: string) => ({ scrubbed, invalid });

  while (index < sql.length) {
    let pair = sql.slice(index, index + 2);

    if (pair === '--') {
      while (index < sql.length && sql[index] !== '\n' && sql[index] !== '\r') index += 1;
      scrubbed += ' ';
      continue;
    }

    if (pair === '/*') {
      let depth = 0;
      while (index < sql.length) {
        if (sql.slice(index, index + 2) === '/*') {
          depth += 1;
          index += 2;
          continue;
        }
        if (sql.slice(index, index + 2) === '*/') {
          depth -= 1;
          index += 2;
          if (depth === 0) break;
          continue;
        }
        index += 1;
      }
      if (depth !== 0) return reject('an unterminated block comment');
      scrubbed += ' ';
      continue;
    }

    let quote = sql[index]!;
    if (quote === "'" || quote === '"') {
      // E'...' honours backslash escapes, so \' does not close the literal there.
      let escapes =
        quote === "'" &&
        (sql[index - 1] === 'E' || sql[index - 1] === 'e') &&
        !/[A-Za-z0-9_]/.test(sql[index - 2] ?? '');
      let closed = false;
      index += 1;
      while (index < sql.length) {
        if (escapes && sql[index] === '\\') {
          index += 2;
          continue;
        }
        if (sql[index] === quote && sql[index + 1] === quote) {
          index += 2;
          continue;
        }
        if (sql[index] === quote) {
          index += 1;
          closed = true;
          break;
        }
        index += 1;
      }
      if (!closed)
        return reject(
          quote === "'"
            ? 'an unterminated string literal'
            : 'an unterminated quoted identifier'
        );
      // Quoting hides a name from the blocklist, and DuckDB resolves "query"(...) and
      // "MD_DELETE_DIVE"(...) exactly like their bare forms.
      if (quote === '"' && /^\s*\(/.test(sql.slice(index)))
        return reject('a quoted identifier used as a function name');
      scrubbed += ' ';
      continue;
    }

    if (quote === '$') {
      let tagEnd = index + 1;
      if (/[A-Za-z_]/.test(sql[tagEnd] ?? '')) {
        while (/[A-Za-z0-9_]/.test(sql[tagEnd] ?? '')) tagEnd += 1;
      }
      if (sql[tagEnd] === '$') {
        let opener = sql.slice(index, tagEnd + 1);
        let close = sql.indexOf(opener, tagEnd + 1);
        if (close === -1) return reject('an unterminated dollar-quoted string');
        index = close + opener.length;
        scrubbed += ' ';
        continue;
      }
    }

    scrubbed += quote;
    index += 1;
  }

  return { scrubbed, invalid: undefined };
};

let assertReadOnlySql = (sql: string) => {
  let { scrubbed: scanned, invalid } = scanReadOnlySql(sql);
  if (invalid) {
    throw createApiServiceError(`Read-only queries must not contain ${invalid}.`, {
      reason: 'motherduck_read_only_query_required'
    });
  }
  let scrubbed = scanned.trim();
  let statements = scrubbed.split(';').filter(statement => statement.trim());
  if (statements.length !== 1) {
    throw createApiServiceError('Read-only queries must contain exactly one SQL statement.', {
      reason: 'motherduck_read_only_query_required'
    });
  }
  if (!/^(SELECT|WITH|SHOW|DESCRIBE|EXPLAIN|VALUES|TABLE|ATTACH|DETACH)\b/i.test(scrubbed)) {
    throw createApiServiceError(
      'The query tool accepts read-only SQL only. Use query_rw for writes.',
      {
        reason: 'motherduck_read_only_query_required'
      }
    );
  }
  if (
    /\b(ALTER|CALL|COMMENT|COPY|CREATE|DELETE|DROP|EXPORT|GRANT|IMPORT|INSERT|INSTALL|LOAD|MERGE|PRAGMA|REPLACE|REVOKE|SET|TRUNCATE|UPDATE|VACUUM)\b/i.test(
      scrubbed
    ) ||
    /\bquery\s*\(/i.test(scrubbed) ||
    /\bMD_(CREATE|UPDATE|DELETE|SET|RUN|CANCEL)_[A-Z0-9_]*\s*\(/i.test(scrubbed)
  ) {
    throw createApiServiceError(
      'The query tool accepts read-only SQL only. Use query_rw for writes.',
      {
        reason: 'motherduck_read_only_query_required'
      }
    );
  }
};

let queryOutput = (result: MotherDuckQueryResult) => {
  let columns = result.fields.map(field => field.name);
  let columnTypes = result.fields.map(
    field =>
      ({
        16: 'BOOLEAN',
        20: 'BIGINT',
        21: 'SMALLINT',
        23: 'INTEGER',
        25: 'VARCHAR',
        114: 'JSON',
        700: 'REAL',
        701: 'DOUBLE',
        1043: 'VARCHAR',
        1082: 'DATE',
        1114: 'TIMESTAMP',
        1184: 'TIMESTAMP WITH TIME ZONE',
        1700: 'DECIMAL',
        2950: 'UUID',
        3802: 'JSON'
      })[field.dataTypeID] ?? `OID_${field.dataTypeID}`
  );
  let rows: unknown[][] = [];
  let characterCount = JSON.stringify({
    success: true,
    columns,
    columnTypes,
    rows: [],
    rowCount: QUERY_ROW_LIMIT
  }).length;
  let truncated = false;
  for (let source of result.rows) {
    if (rows.length === QUERY_ROW_LIMIT) {
      truncated = true;
      break;
    }
    let row = result.fields.map(field =>
      [25, 1043].includes(field.dataTypeID)
        ? parseNested(source[field.name])
        : parseJson(source[field.name])
    );
    let rowCharacters = JSON.stringify(row).length + 1;
    if (characterCount + rowCharacters > QUERY_CHARACTER_LIMIT) {
      truncated = true;
      break;
    }
    rows.push(row);
    characterCount += rowCharacters;
  }
  let output = { success: true, columns, columnTypes, rows, rowCount: rows.length };
  return withInvocationNotice(
    output,
    truncated
      ? 'MotherDuck returned a truncated result (maximum 2,048 rows or 50,000 characters).'
      : undefined
  );
};

let normalizeSearchText = (value: unknown) =>
  text(value).toLowerCase().replace(/[_.]+/g, ' ').replace(/\s+/g, ' ').trim();

let jaroWinklerSimilarity = (leftValue: string, rightValue: string) => {
  if (leftValue === rightValue) return 1;
  if (!leftValue || !rightValue) return 0;
  let matchDistance = Math.max(
    Math.floor(Math.max(leftValue.length, rightValue.length) / 2) - 1,
    0
  );
  let leftMatches = Array.from({ length: leftValue.length }, () => false);
  let rightMatches = Array.from({ length: rightValue.length }, () => false);
  let matches = 0;
  for (let leftIndex = 0; leftIndex < leftValue.length; leftIndex += 1) {
    let start = Math.max(0, leftIndex - matchDistance);
    let end = Math.min(leftIndex + matchDistance + 1, rightValue.length);
    for (let rightIndex = start; rightIndex < end; rightIndex += 1) {
      if (rightMatches[rightIndex] || leftValue[leftIndex] !== rightValue[rightIndex])
        continue;
      leftMatches[leftIndex] = true;
      rightMatches[rightIndex] = true;
      matches += 1;
      break;
    }
  }
  if (!matches) return 0;
  let leftMatched = leftValue.split('').filter((_, index) => leftMatches[index]);
  let rightMatched = rightValue.split('').filter((_, index) => rightMatches[index]);
  let transpositions =
    leftMatched.filter((character, index) => character !== rightMatched[index]).length / 2;
  let jaro =
    (matches / leftValue.length +
      matches / rightValue.length +
      (matches - transpositions) / matches) /
    3;
  let prefix = 0;
  while (
    prefix < Math.min(4, leftValue.length, rightValue.length) &&
    leftValue[prefix] === rightValue[prefix]
  )
    prefix += 1;
  return jaro + prefix * 0.1 * (1 - jaro);
};

// Approximates the catalog query's scoring so shares, which come from a separate metadata
// view that query cannot rank, stay roughly comparable when both sets are merged. The two
// are close but not identical: this normalizes whitespace and DuckDB's
// jaro_winkler_similarity does not.
let searchRelevance = (name: unknown, qualifiedName: unknown, query: unknown) => {
  let needle = normalizeSearchText(query);
  let normalizedName = normalizeSearchText(name);
  let normalizedQualifiedName = normalizeSearchText(qualifiedName);
  if (normalizedName === needle || normalizedQualifiedName === needle) return 1;
  if (normalizedName.startsWith(needle) || normalizedQualifiedName.startsWith(needle))
    return 0.9;
  if (normalizedName.includes(needle) || normalizedQualifiedName.includes(needle)) return 0.8;
  return Math.max(
    jaroWinklerSimilarity(normalizedName, needle),
    jaroWinklerSimilarity(normalizedQualifiedName, needle)
  );
};

let capSearchResults = (results: Row[]) => {
  let counts = new Map<string, number>();
  return results
    .sort((left, right) => number(right.relevanceScore) - number(left.relevanceScore))
    .filter(result => {
      let limit = searchResultLimits[text(result.type)] ?? 0;
      let count = counts.get(text(result.type)) ?? 0;
      if (count >= limit) return false;
      counts.set(text(result.type), count + 1);
      return true;
    })
    .slice(0, SEARCH_RESULT_LIMIT);
};

let diveAppUrl = (id: string, title: unknown, initialState: unknown) => {
  let slug = normalizeSearchText(title)
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-|-$/g, '');
  let state =
    initialState === undefined
      ? ''
      : `#state=${Buffer.from(JSON.stringify(initialState)).toString('base64url')}`;
  return `${DIVE_APP_URL}${id}${slug ? `/${slug}` : ''}${state}`;
};

let isReservedGuideTopic = (topic: string) =>
  ['dives', 'flights'].some(prefix => topic === prefix || topic.startsWith(`${prefix}/`));

let guideReferenceLine = (source: unknown) => {
  let reference = parseJson(source) as Row;
  let referenceType = text(reference.type, 'reference');
  let target =
    referenceType === 'catalog'
      ? [reference.url, reference.schema, reference.table ?? reference.view ?? reference.macro]
          .filter(Boolean)
          .map(value => text(value))
          .join(' ')
      : text(
          reference.uuid ?? reference[`${referenceType}_id`] ?? reference.id,
          'unknown target'
        );
  return `- ${referenceType} ${target}${reference.description ? ` — ${text(reference.description)}` : ''}`;
};

let guideDocument = (source: Row) => {
  let row = normalizeRow(source);
  let references = parseJson(row.references ?? []) as unknown[];
  return [
    text(row.title),
    [
      `uuid: ${text(row.id ?? row.uuid)}`,
      row.topic ? `topic: ${text(row.topic)}` : undefined,
      `v${number(row.version ?? row.current_version)}`,
      text(row.access)
    ]
      .filter(Boolean)
      .join(' · '),
    row.description ? text(row.description) : undefined,
    text(row.content),
    references.length
      ? `## References\n${references.map(guideReferenceLine).join('\n')}`
      : undefined
  ]
    .filter(value => value !== undefined)
    .join('\n\n');
};

let guide = (source: Row) => {
  let row = normalizeRow(source);
  return {
    ...row,
    id: text(row.id ?? row.uuid),
    topic: row.topic ?? null,
    title: text(row.title),
    description: text(row.description),
    access: text(row.access),
    current_version: number(row.current_version ?? row.version),
    created_at: text(row.created_at),
    updated_at: text(row.updated_at ?? row.created_at),
    references: parseJson(row.references ?? [])
  };
};

let flightSummary = (source: Row) => {
  let row = normalizeRow(source);
  return {
    ...row,
    id: text(row.id ?? row.flight_id),
    name: text(row.name ?? row.flight_name),
    schedule_cron: row.schedule_cron ?? null,
    current_version: number(row.current_version ?? row.version)
  };
};

let flightRecord = (source: Row) => {
  let row = normalizeRow(source);
  return {
    ...row,
    flight_id: text(row.flight_id ?? row.id),
    flight_name: text(row.flight_name ?? row.name),
    created_at: text(row.created_at),
    updated_at: text(row.updated_at ?? row.created_at),
    schedule_cron: row.schedule_cron ?? null,
    status: text(row.status),
    schedule_status: row.schedule_status ?? null,
    current_version: number(row.current_version ?? row.version),
    owner_name: row.owner_name ?? null
  };
};

let diveRecord = (source: Row) => {
  let row = normalizeRow(source);
  return {
    ...row,
    id: text(row.id),
    title: text(row.title),
    description: text(row.description),
    content: text(row.content),
    current_version: number(row.current_version ?? row.version),
    created_at: text(row.created_at),
    updated_at: text(row.updated_at ?? row.created_at),
    status: text(row.status),
    status_changed_at: row.status_changed_at ? text(row.status_changed_at) : null,
    status_applies_to_version:
      row.status_applies_to_version === null || row.status_applies_to_version === undefined
        ? null
        : number(row.status_applies_to_version)
  };
};

let flightRun = (source: Row) => {
  let row = normalizeRow(source);
  return {
    ...row,
    run_id: text(row.run_id ?? row.id),
    flight_id: text(row.flight_id),
    flight_name: text(row.flight_name ?? row.name),
    flight_version: number(row.flight_version ?? row.version),
    config: parseJson(row.config ?? {}),
    run_number: number(row.run_number),
    is_scheduled: boolean(row.is_scheduled),
    status: text(row.status),
    created_at: text(row.created_at),
    started_at: row.started_at ? text(row.started_at) : null,
    ended_at: row.ended_at ? text(row.ended_at) : null,
    scheduled_at: text(row.scheduled_at ?? row.created_at),
    cancelled_at: row.cancelled_at ? text(row.cancelled_at) : null,
    exit_code:
      row.exit_code === null || row.exit_code === undefined ? null : number(row.exit_code)
  };
};

let getDive = async (client: MotherDuckClient, id: string, version?: number) => {
  let params = new SqlParameters();
  let current = (
    await functionQuery(client, 'MD_GET_DIVE', [`id := ${params.add(id, 'UUID')}`], params)
  )[0];
  if (!current) return undefined;
  if (!version) return current;
  let versionParams = new SqlParameters();
  let snapshot = (
    await functionQuery(
      client,
      'MD_GET_DIVE_VERSION',
      [
        `id := ${versionParams.add(id, 'UUID')}`,
        `version := ${versionParams.add(version, 'UINTEGER')}`
      ],
      versionParams
    )
  )[0];
  return snapshot
    ? {
        ...snapshot,
        ...current,
        content: snapshot.content,
        required_resources: snapshot.required_resources
      }
    : current;
};

let listAllDives = async (client: MotherDuckClient) => {
  let rows: Row[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    let params = new SqlParameters();
    let batch = await functionQuery(
      client,
      'MD_LIST_DIVES',
      [
        `"limit" := ${params.add(PAGE_SIZE, 'INTEGER')}`,
        `"offset" := ${params.add(rows.length, 'INTEGER')}`,
        `include_org_shares := ${params.add(true, 'BOOLEAN')}`
      ],
      params
    );
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return { rows, truncated: false };
  }
  return { rows, truncated: true };
};

let getFlight = async (client: MotherDuckClient, id: string, version?: number) => {
  let params = new SqlParameters();
  let summary = (
    await functionQuery(
      client,
      'MD_GET_FLIGHT',
      [`flight_id := ${params.add(id, 'UUID')}`],
      params
    )
  )[0];
  if (!summary) return undefined;
  let versionParams = new SqlParameters();
  let snapshot = (
    await functionQuery(
      client,
      'MD_GET_FLIGHT_VERSION',
      [
        `flight_id := ${versionParams.add(id, 'UUID')}`,
        `version_number := ${versionParams.add(
          version ?? number(summary.current_version),
          'UINTEGER'
        )}`
      ],
      versionParams
    )
  )[0];
  return { summary, snapshot };
};

let listAllFlights = async (client: MotherDuckClient, ownerOnly?: unknown) => {
  let rows: Row[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    let params = new SqlParameters();
    let batch = await functionQuery(
      client,
      'MD_LIST_FLIGHTS',
      [
        `"LIMIT" := ${params.add(PAGE_SIZE, 'UINTEGER')}`,
        `"OFFSET" := ${params.add(rows.length, 'UINTEGER')}`,
        optional('owner_only', ownerOnly, params, 'BOOLEAN')
      ],
      params
    );
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return rows;
};

let getGuide = async (client: MotherDuckClient, id: string, version?: number) => {
  let params = new SqlParameters();
  return (
    await functionQuery(
      client,
      'MD_GET_GUIDE',
      [
        `id := ${params.add(id, 'UUID')}`,
        version === undefined ? undefined : `version := ${params.add(version, 'UINTEGER')}`
      ],
      params
    )
  )[0];
};

let listAllGuides = async (client: MotherDuckClient, topic?: unknown) => {
  let rows: Row[] = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    let params = new SqlParameters();
    let batch = await functionQuery(
      client,
      'MD_LIST_GUIDES',
      [
        optional('topic', topic, params),
        `"limit" := ${params.add(PAGE_SIZE, 'INTEGER')}`,
        `"offset" := ${params.add(rows.length, 'INTEGER')}`
      ],
      params
    );
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }
  return rows;
};

let coreTool = async (client: MotherDuckClient, key: string, input: Input): Promise<Row> => {
  if (key === 'get_current_user') {
    let result = await client.query('SELECT * FROM MD_USER_INFO()');
    let row = result.rows[0] ? normalizeRow(result.rows[0]) : undefined;
    let userId = text(row?.user_id);
    let username = text(row?.username);
    if (!row || !userId || !username)
      throw createApiServiceError(
        'MotherDuck did not return the authenticated user profile.',
        {
          reason: 'motherduck_current_user_missing'
        }
      );
    return {
      success: true,
      user: {
        id: userId,
        username,
        organization_id: row.org_id ? text(row.org_id) : null,
        organization_name: row.org_name ? text(row.org_name) : null,
        region: text(row.region)
      }
    };
  }

  if (key === 'list_databases') {
    let result = await client.query(`
      SELECT all_db.alias, attached.alias IS NOT NULL AS is_attached, all_db.type
      FROM MD_ALL_DATABASES() AS all_db
      LEFT JOIN MD_ATTACHED_DATABASES() AS attached USING (alias)
      ORDER BY all_db.alias
    `);
    return { success: true, databases: result.rows.map(normalizeRow) };
  }

  if (key === 'list_columns') {
    let schema = input.schema ?? 'main';
    let result = await client.query(
      `SELECT c.column_name AS name, c.data_type AS type, c.is_nullable AS nullable,
              c.comment,
              CASE WHEN v.view_name IS NULL THEN 'table' ELSE 'view' END AS object_type
       FROM duckdb_columns() c
       LEFT JOIN duckdb_views() v
         ON v.database_name = c.database_name
        AND v.schema_name = c.schema_name
        AND v.view_name = c.table_name
       WHERE c.database_name = $1 AND c.schema_name = $2 AND c.table_name = $3
       ORDER BY c.column_index`,
      [input.database, schema, input.table],
      input.database
    );
    let rows = result.rows.map(normalizeRow);
    return {
      success: true,
      database: input.database,
      schema,
      table: input.table,
      objectType: rows[0]?.object_type ?? 'table',
      columns: rows.map(row => ({
        name: text(row.name),
        type: text(row.type),
        nullable: row.nullable === true || String(row.nullable).toUpperCase() === 'YES',
        comment: row.comment ?? null
      })),
      columnCount: rows.length
    };
  }

  if (key === 'list_macros') {
    let limit = input.limit ?? DEFAULT_LIMIT;
    let keywords = text(input.keywords).toLowerCase().split(/\s+/).filter(Boolean);
    let result = await client.query(
      `SELECT schema_name AS schema, function_name AS name, function_type AS type, parameters
       FROM duckdb_functions()
       WHERE database_name = $1
         AND function_type IN ('macro', 'table_macro')
         AND ($2::VARCHAR IS NULL OR schema_name = $2)
       ORDER BY schema_name, function_name`,
      [input.database, input.schema ?? null],
      input.database
    );
    let all = result.rows
      .map(normalizeRow)
      .filter(
        row =>
          !keywords.length ||
          keywords.some(word => text(row.name).toLowerCase().includes(word))
      );
    let macros = all.slice(0, limit).map(row => ({
      schema: text(row.schema),
      name: text(row.name),
      type: text(row.type),
      parameters: parseJson(row.parameters ?? [])
    }));
    return {
      success: true,
      database: input.database,
      schema: input.schema ?? 'all',
      macros,
      count: macros.length,
      totalCount: all.length,
      truncated: all.length > macros.length
    };
  }

  if (key === 'list_shares') {
    let result = await client.query('SELECT * FROM MD_INFORMATION_SCHEMA.SHARED_WITH_ME');
    return {
      success: true,
      shares: result.rows.map(source => {
        let row = normalizeRow(source);
        return {
          name: text(row.name ?? row.share_name ?? row.alias),
          url: text(row.url ?? row.share_url ?? row.database_url)
        };
      })
    };
  }

  if (key === 'list_tables') {
    let result = await client.query(
      `SELECT schema_name AS schema, table_name AS name, 'table' AS type, comment
       FROM duckdb_tables() WHERE database_name = $1 AND ($2::VARCHAR IS NULL OR schema_name = $2)
       UNION ALL
       SELECT schema_name, view_name, 'view', comment
       FROM duckdb_views() WHERE database_name = $1 AND ($2::VARCHAR IS NULL OR schema_name = $2)
       ORDER BY schema, name`,
      [input.database, input.schema ?? null],
      input.database
    );
    let tables = result.rows.map(normalizeRow);
    return {
      success: true,
      database: input.database,
      schema: input.schema ?? 'all',
      tables,
      tableCount: tables.filter(row => row.type === 'table').length,
      viewCount: tables.filter(row => row.type === 'view').length
    };
  }

  if (key === 'list_views') {
    let limit = input.limit ?? DEFAULT_LIMIT;
    let words = text(input.keywords).toLowerCase().split(/\s+/).filter(Boolean);
    let result = await client.query(
      `SELECT v.schema_name AS schema, v.view_name AS name, v.comment,
              COUNT(c.column_name)::INTEGER AS column_count
       FROM duckdb_views() v
       LEFT JOIN duckdb_columns() c
         ON c.database_name = v.database_name
        AND c.schema_name = v.schema_name
        AND c.table_name = v.view_name
       WHERE v.database_name = $1 AND ($2::VARCHAR IS NULL OR v.schema_name = $2)
       GROUP BY v.schema_name, v.view_name, v.comment
       ORDER BY v.schema_name, v.view_name`,
      [input.database, input.schema ?? null],
      input.database
    );
    let all = result.rows.map(normalizeRow).filter(row => {
      let haystack = `${text(row.name)} ${text(row.comment)}`.toLowerCase();
      return !words.length || words.some(word => haystack.includes(word));
    });
    let views = all
      .slice(0, limit)
      .map(row => ({ ...row, column_count: number(row.column_count) }));
    return {
      success: true,
      database: input.database,
      schema: input.schema ?? 'all',
      views,
      count: views.length,
      totalCount: all.length,
      truncated: all.length > views.length
    };
  }

  if (key === 'query' || key === 'query_rw') {
    if (key === 'query') assertReadOnlySql(input.sql);
    return queryOutput(await client.query(input.sql, [], input.database ?? 'md:'));
  }

  if (key === 'search_catalog') {
    let result = await client.query(
      `WITH catalog AS (
        SELECT 'database' AS type, alias AS name, alias AS fully_qualified_name,
               alias AS database, NULL::VARCHAR AS schema, NULL::VARCHAR AS table_name,
               NULL::VARCHAR AS data_type, NULL::VARCHAR AS comment
        FROM MD_ALL_DATABASES()
        UNION ALL
        SELECT DISTINCT 'schema', schema_name, database_name || '.' || schema_name,
               database_name, schema_name, NULL, NULL, NULL FROM duckdb_columns()
        UNION ALL
        SELECT 'table', table_name, database_name || '.' || schema_name || '.' || table_name,
               database_name, schema_name, table_name, NULL, comment FROM duckdb_tables()
        UNION ALL
        SELECT 'column', column_name,
               database_name || '.' || schema_name || '.' || table_name || '.' || column_name,
               database_name, schema_name, table_name, data_type, comment FROM duckdb_columns()
      ), normalized AS (
        SELECT *,
               regexp_replace(lower(name), '[_.]+', ' ', 'g') AS normalized_name,
               regexp_replace(lower(fully_qualified_name), '[_.]+', ' ', 'g') AS normalized_path,
               regexp_replace(lower($1), '[_.]+', ' ', 'g') AS normalized_query
        FROM catalog
      ), scored AS (
        SELECT *, greatest(
          CASE WHEN normalized_name = normalized_query OR normalized_path = normalized_query THEN 1.0
               WHEN starts_with(normalized_name, normalized_query)
                 OR starts_with(normalized_path, normalized_query) THEN 0.9
               WHEN contains(normalized_name, normalized_query)
                 OR contains(normalized_path, normalized_query) THEN 0.8
               ELSE 0 END,
          jaro_winkler_similarity(normalized_name, normalized_query),
          jaro_winkler_similarity(normalized_path, normalized_query)
        ) AS relevance_score
        FROM normalized
      ), ranked AS (
        SELECT *, row_number() OVER (
          PARTITION BY type ORDER BY relevance_score DESC, fully_qualified_name
        ) AS type_rank
        FROM scored
        WHERE relevance_score >= 0.55
      )
      SELECT type, name, fully_qualified_name, database, schema, table_name, data_type,
             comment, relevance_score
      FROM ranked
      WHERE type_rank <= CASE type
        WHEN 'column' THEN 40
        WHEN 'table' THEN 30
        WHEN 'schema' THEN 20
        WHEN 'database' THEN 20
        ELSE 0
      END
      ORDER BY relevance_score DESC, fully_qualified_name`,
      [input.query]
    );
    let results: Row[] = result.rows
      .map(source => {
        let row = normalizeRow(source);
        return {
          type: row.type,
          name: text(row.name),
          fullyQualifiedName: text(row.fully_qualified_name),
          database: row.database ?? null,
          schema: row.schema ?? null,
          table: row.table_name ?? null,
          dataType: row.data_type ?? null,
          comment: row.comment ?? null,
          relevanceScore: number(row.relevance_score)
        };
      })
      .filter(row => !input.object_types || input.object_types.includes(row.type));
    if (!input.object_types || input.object_types.includes('share')) {
      let shares = await client.query('SELECT * FROM MD_INFORMATION_SCHEMA.SHARED_WITH_ME');
      for (let source of shares.rows) {
        let row = normalizeRow(source);
        let name = text(row.name ?? row.share_name ?? row.alias);
        let url = text(row.url ?? row.share_url ?? row.database_url);
        let relevanceScore = searchRelevance(name, url, input.query);
        if (relevanceScore < 0.55) continue;
        results.push({
          type: 'share',
          name,
          fullyQualifiedName: url || name,
          database: null,
          schema: null,
          table: null,
          dataType: url || null,
          comment: null,
          relevanceScore
        });
      }
    }
    results = capSearchResults(results);
    return { success: true, query: input.query, resultCount: results.length, results };
  }

  throw createApiServiceError(`Unknown MotherDuck core tool: ${key}`);
};

let diveTool = async (client: MotherDuckClient, key: string, input: Input): Promise<Row> => {
  if (key === 'delete_dive') {
    let params = new SqlParameters();
    await functionQuery(
      client,
      'MD_DELETE_DIVE',
      [`id := ${params.add(input.id, 'UUID')}`],
      params
    );
    return { success: true, message: `Deleted Dive ${input.id}.` };
  }

  if (key === 'list_dives') {
    let { rows, truncated } = await listAllDives(client);
    let words = text(input.keywords).toLowerCase().split(/\s+/).filter(Boolean);
    let all = rows.filter(row => {
      let matchesStatus =
        input.include_archived || text(row.status).toLowerCase() !== 'archived';
      let haystack = `${text(row.title)} ${text(row.description)}`.toLowerCase();
      return matchesStatus && (!words.length || words.every(word => haystack.includes(word)));
    });
    let dives = all.map(row => ({
      ...row,
      id: text(row.id),
      title: text(row.title),
      description: text(row.description),
      owner_name: text(row.owner_name),
      current_version: number(row.current_version),
      created_at: text(row.created_at),
      updated_at: text(row.updated_at),
      status: text(row.status),
      status_changed_at: row.status_changed_at ? text(row.status_changed_at) : null,
      status_applies_to_version:
        row.status_applies_to_version === null || row.status_applies_to_version === undefined
          ? null
          : number(row.status_applies_to_version)
    }));
    return {
      success: true,
      dives,
      count: dives.length,
      totalCount: dives.length,
      truncated,
      message: truncated ? `Results are capped at ${PAGE_SIZE * MAX_PAGES} Dives.` : undefined
    };
  }

  if (key === 'read_dive') {
    let row = await getDive(client, input.id, input.version);
    return { success: true, dive: row ? diveRecord(row) : undefined };
  }

  if (key === 'save_dive') {
    let params = new SqlParameters();
    let row = (
      await functionQuery(
        client,
        'MD_CREATE_DIVE',
        [
          `title := ${params.add(input.title)}`,
          `content := ${params.add(input.content)}`,
          optional('description', input.description, params)
        ],
        params
      )
    )[0];
    return {
      success: true,
      dive: row,
      dive_url: row?.id ? `${DIVE_APP_URL}${row.id}` : undefined,
      warnings: [
        'Native MD_CREATE_DIVE stores the component but does not perform the remote MCP server code-validation or database-analysis pass.'
      ]
    };
  }

  if (key === 'update_dive') {
    if (input.content !== undefined) {
      let current = await getDive(client, input.id);
      let currentVersion = current?.current_version
        ? await getDive(client, input.id, number(current.current_version))
        : current;
      let resources = parseJson(currentVersion?.required_resources ?? []);
      let params = new SqlParameters();
      await functionQuery(
        client,
        'MD_UPDATE_DIVE_CONTENT',
        [
          `id := ${params.add(input.id, 'UUID')}`,
          `content := ${params.add(input.content)}`,
          resources.length
            ? optionalJson(
                'required_resources',
                resources,
                params,
                'STRUCT(url VARCHAR, alias VARCHAR)[]'
              )
            : undefined
        ],
        params
      );
    }
    if (input.title !== undefined || input.description !== undefined) {
      let params = new SqlParameters();
      await functionQuery(
        client,
        'MD_UPDATE_DIVE_METADATA',
        [
          `id := ${params.add(input.id, 'UUID')}`,
          optional('title', input.title, params),
          optional('description', input.description, params)
        ],
        params
      );
    }
    let dive = await getDive(client, input.id);
    return {
      success: true,
      dive,
      dive_url: `${DIVE_APP_URL}${input.id}`,
      warnings: input.content
        ? ['Native SQL updates do not run the remote MCP server code-validation pass.']
        : undefined
    };
  }

  if (key === 'view_dive') {
    let row = await getDive(client, input.dive_id);
    let currentVersion = row?.current_version
      ? await getDive(client, input.dive_id, number(row.current_version))
      : row;
    return {
      success: true,
      dive_id: input.dive_id,
      title: row?.title,
      source: row?.content,
      current_version: number(row?.current_version),
      dive_app_url: diveAppUrl(input.dive_id, row?.title, input.initial_state),
      initial_state: input.initial_state,
      required_resources:
        input.required_resources ?? parseJson(currentVersion?.required_resources ?? [])
    };
  }

  throw createApiServiceError(`Unknown MotherDuck Dive tool: ${key}`);
};

let flightTool = async (client: MotherDuckClient, key: string, input: Input): Promise<Row> => {
  if (key === 'cancel_flight_run') {
    let params = new SqlParameters();
    await procedureQuery(
      client,
      'MD_CANCEL_FLIGHT_RUN',
      [
        `flight_id := ${params.add(input.id, 'UUID')}`,
        `run_number := ${params.add(input.run_number, 'UBIGINT')}`
      ],
      params
    );
    return { success: true, canceled: true };
  }

  if (key === 'create_flight' || key === 'update_flight') {
    let params = new SqlParameters();
    let isCreate = key === 'create_flight';
    let args = [
      ...(isCreate
        ? [
            `name := ${params.add(input.name)}`,
            `source_code := ${params.add(input.source_code)}`
          ]
        : [`flight_id := ${params.add(input.id, 'UUID')}`]),
      optional('name', isCreate ? undefined : input.name, params),
      optional('schedule_cron', input.schedule_cron, params),
      optional('requirements_txt', input.requirements_txt, params),
      optionalJson('config', input.config, params, 'MAP(VARCHAR, VARCHAR)'),
      optional('access_token_name', input.md_token_name, params),
      optionalJson('flight_secret_names', input.md_secret_names, params, 'VARCHAR[]'),
      optional('source_code', isCreate ? undefined : input.source_code, params)
    ];
    let rows = isCreate
      ? await functionQuery(client, 'MD_CREATE_FLIGHT', args, params)
      : await procedureQuery(client, 'MD_UPDATE_FLIGHT', args, params);
    let row = rows[0];
    return { success: true, flight: row ? flightSummary(row) : undefined };
  }

  if (key === 'delete_flight') {
    let params = new SqlParameters();
    await procedureQuery(
      client,
      'MD_DELETE_FLIGHT',
      [`flight_id := ${params.add(input.id, 'UUID')}`],
      params
    );
    return { success: true };
  }

  if (key === 'edit_flight_source') {
    let current = await getFlight(client, input.id);
    if (!current?.snapshot) throw createApiServiceError(`Flight ${input.id} was not found.`);
    let edited = applyEdits(text(current.snapshot.source_code), input.edits);
    let params = new SqlParameters();
    let row = (
      await procedureQuery(
        client,
        'MD_UPDATE_FLIGHT',
        [
          `flight_id := ${params.add(input.id, 'UUID')}`,
          optional('source_code', edited.content, params)
        ],
        params
      )
    )[0];
    return {
      success: true,
      flight: {
        id: text(row?.id ?? row?.flight_id ?? input.id),
        name: text(row?.name ?? row?.flight_name ?? current.summary.name),
        current_version: number(row?.current_version ?? current.summary.current_version)
      }
    };
  }

  if (key === 'get_flight') {
    let current = await getFlight(client, input.id, input.version);
    if (!current) return { success: true };
    let summary = flightRecord(current.summary);
    let snapshot = normalizeRow(current.snapshot ?? {});
    return {
      success: true,
      flight: {
        ...summary,
        version_info: {
          ...snapshot,
          version_id: text(snapshot.version_id ?? snapshot.id),
          flight_id: text(snapshot.flight_id ?? input.id),
          version: number(snapshot.flight_version ?? input.version ?? summary.current_version),
          created_at: text(snapshot.created_at),
          source_code: text(snapshot.source_code),
          requirements_txt: snapshot.requirements_txt ?? null,
          config: parseJson(snapshot.config ?? {}),
          access_token_name: text(snapshot.access_token_name),
          flight_secret_names: parseJson(snapshot.flight_secret_names ?? []),
          max_runtime_sec: number(snapshot.max_runtime_sec)
        }
      }
    };
  }

  if (key === 'list_flights') {
    let rows = await listAllFlights(client, input.owner_only);
    let words = text(input.keywords).toLowerCase().split(/\s+/).filter(Boolean);
    let matches = rows.filter(row =>
      words.every(word =>
        text(row.flight_name ?? row.name)
          .toLowerCase()
          .includes(word)
      )
    );
    let offset = input.offset ?? 0;
    let limit = input.limit ?? 50;
    let flights = matches.slice(offset, offset + limit).map(flightRecord);
    return {
      success: true,
      flights,
      count: flights.length,
      totalCount: matches.length,
      truncated: offset + flights.length < matches.length
    };
  }

  if (key === 'list_flight_runs') {
    let limit = input.limit ?? DEFAULT_LIMIT;
    let params = new SqlParameters();
    let rows = await functionQuery(
      client,
      'MD_LIST_FLIGHT_RUNS',
      [
        `flight_id := ${params.add(input.id, 'UUID')}`,
        `"LIMIT" := ${params.add(FLIGHT_RUN_FETCH_LIMIT, 'UINTEGER')}`
      ],
      params
    );
    let selected = rows.slice(0, limit);
    let reachedFetchLimit = rows.length === FLIGHT_RUN_FETCH_LIMIT;
    return withInvocationNotice(
      {
        success: true,
        flight_id: input.id,
        runs: selected.map(flightRun),
        count: selected.length,
        totalCount: rows.length,
        truncated: reachedFetchLimit || selected.length < rows.length
      },
      reachedFetchLimit
        ? `MotherDuck returned only the ${FLIGHT_RUN_FETCH_LIMIT} most recent runs, so totalCount is a lower bound.`
        : undefined
    );
  }

  if (key === 'list_flight_versions') {
    let limit = input.limit ?? DEFAULT_LIMIT;
    let params = new SqlParameters();
    let versions = await functionQuery(
      client,
      'MD_LIST_FLIGHT_VERSIONS',
      [
        `flight_id := ${params.add(input.id, 'UUID')}`,
        `"LIMIT" := ${params.add(limit, 'UINTEGER')}`
      ],
      params
    );
    let snapshots = await mapInBatches(
      versions,
      8,
      async version =>
        (await getFlight(client, input.id, number(version.flight_version)))?.snapshot
    );
    return {
      success: true,
      versions: snapshots.filter(Boolean).map(source => {
        let row = normalizeRow(source!);
        return {
          ...row,
          version: number(row.flight_version),
          source_code: text(row.source_code),
          requirements_txt: text(row.requirements_txt),
          md_token_name: text(row.access_token_name),
          md_secret_names: parseJson(row.flight_secret_names ?? []),
          config: parseJson(row.config ?? {}),
          created_at: text(row.created_at)
        };
      }),
      count: snapshots.filter(Boolean).length
    };
  }

  if (key === 'run_flight') {
    let params = new SqlParameters();
    let row = (
      await functionQuery(
        client,
        'MD_RUN_FLIGHT',
        [
          `flight_id := ${params.add(input.id, 'UUID')}`,
          optionalJson('config', input.config, params, 'MAP(VARCHAR, VARCHAR)')
        ],
        params
      )
    )[0];
    return { success: true, run: row ? flightRun(row) : undefined };
  }

  if (key === 'get_flight_run_logs') {
    let params = new SqlParameters();
    let logRow = (
      await functionQuery(
        client,
        'MD_GET_FLIGHT_LOGS',
        [
          `flight_id := ${params.add(input.id, 'UUID')}`,
          `run_number := ${params.add(input.run_number, 'UBIGINT')}`
        ],
        params
      )
    )[0];
    let runParams = new SqlParameters();
    let runs = await functionQuery(
      client,
      'MD_LIST_FLIGHT_RUNS',
      [
        `flight_id := ${runParams.add(input.id, 'UUID')}`,
        `"LIMIT" := ${runParams.add(FLIGHT_RUN_FETCH_LIMIT, 'UINTEGER')}`
      ],
      runParams
    );
    let logs = text(logRow?.logs ?? logRow?.log);
    let originalLength = Buffer.byteLength(logs);
    let maxBytes = input.max_bytes ?? originalLength;
    let truncated = originalLength > maxBytes;
    if (truncated) logs = tailBytes(logs, maxBytes);
    let run = runs.find(candidate => number(candidate.run_number) === input.run_number);
    return withInvocationNotice(
      {
        success: true,
        flight_id: input.id,
        run_number: input.run_number,
        run: run ? flightRun(run) : undefined,
        logs,
        truncated,
        original_length: originalLength
      },
      run
        ? undefined
        : runs.length === FLIGHT_RUN_FETCH_LIMIT
          ? `Run ${input.run_number} is outside the ${FLIGHT_RUN_FETCH_LIMIT} most recent runs, so its run record is unavailable.`
          : `Run ${input.run_number} was not found for this Flight.`
    );
  }

  throw createApiServiceError(`Unknown MotherDuck Flight tool: ${key}`);
};

const GUIDE_REFERENCE_TYPE =
  'STRUCT("type" VARCHAR, url VARCHAR, schema VARCHAR, "table" VARCHAR, "column" VARCHAR, view VARCHAR, macro VARCHAR, uuid UUID, description VARCHAR)[]';

let guideTool = async (client: MotherDuckClient, key: string, input: Input): Promise<Row> => {
  if (key === 'create_guide' || key === 'update_guide') {
    let params = new SqlParameters();
    let isCreate = key === 'create_guide';
    let args = [
      ...(isCreate
        ? [
            optional('topic', input.topic, params),
            `title := ${params.add(input.title)}`,
            `content := ${params.add(input.content)}`
          ]
        : [
            `id := ${params.add(input.uuid, 'UUID')}`,
            optional('content', input.content, params)
          ]),
      optional('description', isCreate ? input.description : undefined, params),
      optional('access', isCreate ? input.access : undefined, params),
      optional('change_comment', input.change_comment, params),
      optional('external_id', input.external_id, params),
      optionalJson('"references"', input.references, params, GUIDE_REFERENCE_TYPE)
    ];
    let row = (
      await functionQuery(
        client,
        isCreate ? 'MD_CREATE_GUIDE' : 'MD_UPDATE_GUIDE',
        args,
        params
      )
    )[0];
    return { success: true, guide: row ? guide(row) : undefined };
  }

  if (key === 'delete_guide') {
    let params = new SqlParameters();
    let row = (
      await functionQuery(
        client,
        'MD_DELETE_GUIDE',
        [`id := ${params.add(input.uuid, 'UUID')}`],
        params
      )
    )[0];
    return { success: true, deleted: row?.success ?? true };
  }

  if (key === 'get_guide') {
    let row = await getGuide(client, input.uuid, input.version);
    return row ? { success: true, text: guideDocument(row) } : { success: true, text: '' };
  }

  if (key === 'get_query_guide') {
    let rows = await listAllGuides(client);
    let queryGuides = rows.filter(row => !isReservedGuideTopic(text(row.topic).toLowerCase()));
    let rootGuides = queryGuides.filter(row => !text(row.topic));
    let topicCounts = new Map<string, number>();
    for (let row of queryGuides) {
      let topic = text(row.topic);
      if (topic) topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1);
    }
    return {
      success: true,
      text: [
        '# Query guidance',
        'Use list_guides to browse a topic and get_guide to read the relevant Guide before writing SQL.',
        '# Available topics',
        [...topicCounts]
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([topic, count]) => `- ${topic}/ (${count} guide${count === 1 ? '' : 's'})`)
          .join('\n'),
        '# Root-level Guides',
        rootGuides
          .map(
            row =>
              `- "${text(row.title)}"${row.description ? ` — ${text(row.description)}` : ''} (${text(
                row.access
              )}, uuid: ${text(row.id ?? row.uuid)})`
          )
          .join('\n')
      ].join('\n\n')
    };
  }

  if (key === 'list_guides') {
    let rows = await listAllGuides(client, input.topic);
    let current = input.topic ? `${input.topic}/` : '';
    let directGuides = rows.filter(row => text(row.topic) === text(input.topic));
    let topicCounts = new Map<string, number>();
    for (let row of rows) {
      let topic = text(row.topic);
      if (!topic.startsWith(current) || topic === text(input.topic)) continue;
      let next = topic.slice(current.length).split('/')[0];
      let full = `${current}${next}`;
      topicCounts.set(full, (topicCounts.get(full) ?? 0) + 1);
    }
    return {
      success: true,
      topic: input.topic ?? '',
      topics: [...topicCounts].map(([topic, guide_count]) => ({ topic, guide_count })),
      guides: directGuides.map(row => ({
        uuid: text(row.id ?? row.uuid),
        topic: text(row.topic),
        title: text(row.title),
        access: text(row.access),
        description: text(row.description)
      }))
    };
  }

  if (key === 'set_guide_access' || key === 'update_guide_metadata') {
    let params = new SqlParameters();
    let isAccess = key === 'set_guide_access';
    let row = (
      await functionQuery(
        client,
        isAccess ? 'MD_SET_GUIDE_ACCESS' : 'MD_UPDATE_GUIDE_METADATA',
        [
          `id := ${params.add(input.uuid, 'UUID')}`,
          ...(isAccess
            ? [`access := ${params.add(input.access)}`]
            : [
                optional('title', input.title, params),
                optional('description', input.description, params),
                optional('topic', input.topic, params)
              ])
        ],
        params
      )
    )[0];
    return { success: true, guide: row ? guide(row) : undefined };
  }

  if (key === 'edit_guide_content') {
    let current = await getGuide(client, input.uuid);
    if (!current) throw createApiServiceError(`Guide ${input.uuid} was not found.`);
    let edited = applyEdits(text(current.content), input.edits);
    let params = new SqlParameters();
    let row = (
      await functionQuery(
        client,
        'MD_UPDATE_GUIDE',
        [
          `id := ${params.add(input.uuid, 'UUID')}`,
          optional('content', edited.content, params),
          optional('change_comment', input.change_comment, params),
          optional('external_id', input.external_id, params)
        ],
        params
      )
    )[0];
    return {
      success: true,
      guide: row ? guide(row) : undefined,
      edits_applied: input.edits.length,
      total_replacements: edited.replacements,
      hint: 'A new Guide version was created with the edited content.'
    };
  }

  throw createApiServiceError(`Unknown MotherDuck Guide tool: ${key}`);
};

export let invokeMotherDuckTool = async (
  client: MotherDuckClient,
  key: string,
  input: Input
) => {
  if (
    [
      'get_current_user',
      'list_columns',
      'list_databases',
      'list_macros',
      'list_shares',
      'list_tables',
      'list_views',
      'query',
      'query_rw',
      'search_catalog'
    ].includes(key)
  )
    return coreTool(client, key, input);
  if (
    [
      'delete_dive',
      'list_dives',
      'read_dive',
      'save_dive',
      'update_dive',
      'view_dive'
    ].includes(key)
  )
    return diveTool(client, key, input);
  if (
    [
      'cancel_flight_run',
      'create_flight',
      'delete_flight',
      'edit_flight_source',
      'get_flight_run_logs',
      'get_flight',
      'list_flight_runs',
      'list_flight_versions',
      'list_flights',
      'run_flight',
      'update_flight'
    ].includes(key)
  )
    return flightTool(client, key, input);
  return guideTool(client, key, input);
};

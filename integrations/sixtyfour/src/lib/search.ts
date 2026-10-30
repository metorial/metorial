import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { createApiServiceError } from 'slates';
import { z } from 'zod';

export const searchRecord = z.record(z.string(), z.unknown());
export type SearchRecord = z.infer<typeof searchRecord>;
export type SearchMode = 'company' | 'people';
const maxHandleBytes = 512 * 1024;
const snapshotSchema = z.object({
  mode: z.enum(['company', 'people']),
  expires: z.number().int(),
  record: searchRecord
});
const keyFor = (token: string) =>
  createHash('sha256').update('sixtyfour-search-snapshot-v1\0').update(token).digest();

// The REST API returns full records, whereas the hosted MCP retains records behind
// session handles. Key-bound snapshots preserve that workflow across stateless calls.
export const createResultHandle = (token: string, mode: SearchMode, record: SearchRecord) => {
  const body = Buffer.from(
    JSON.stringify({ mode, expires: Date.now() + 20 * 60_000, record })
  );
  if (body.length > maxHandleBytes)
    throw createApiServiceError(
      'The search record is too large to return a detail handle. Narrow the search.'
    );
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFor(token), iv);
  const encrypted = Buffer.concat([cipher.update(body), cipher.final()]);
  return `s64v1.${Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url')}`;
};

export const readResultHandle = (
  token: string,
  mode: SearchMode,
  handle: string
): SearchRecord => {
  const invalid = () =>
    createApiServiceError(
      'This result handle is invalid, expired, or belongs to another API key or search type. Run the matching search again and use its result_handle.'
    );
  if (
    !/^s64v1\.[A-Za-z0-9_-]+$/.test(handle) ||
    handle.length > ((maxHandleBytes + 28) * 4) / 3 + 10
  )
    throw invalid();
  try {
    const payload = Buffer.from(handle.slice(6), 'base64url');
    if (payload.length < 29 || payload.length > maxHandleBytes + 28) throw invalid();
    const decipher = createDecipheriv('aes-256-gcm', keyFor(token), payload.subarray(0, 12));
    decipher.setAuthTag(payload.subarray(12, 28));
    const plain = Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]);
    const parsed = snapshotSchema.safeParse(JSON.parse(plain.toString('utf8')));
    if (!parsed.success || parsed.data.mode !== mode || parsed.data.expires <= Date.now())
      throw invalid();
    return parsed.data.record;
  } catch {
    throw invalid();
  }
};

export const readSearchResponse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw createApiServiceError(
      'Sixtyfour returned an unexpected search response. Retry the read or contact support.'
    );
  return parsed.data;
};

export const searchSummary = (record: SearchRecord) => {
  const source = searchRecord.safeParse(record.raw_source);
  const row = source.success ? source.data : record;
  const text = (...values: unknown[]) =>
    values.find((v): v is string => typeof v === 'string' && v.length > 0);
  return {
    id: text(record.source_id, row.publicId, row.id, row.companyId),
    name: text(row.fullName, row.name, row.company_name, record.name),
    linkedin_url: text(row.linkedinUrl, row.linkedin_url, record.linkedin_url),
    website: text(row.website, row.domain, record.website),
    headline: text(row.headline, row.description)
  };
};

const linkedinUrl = z
  .string()
  .max(500)
  .refine(value => {
    try {
      const url = new URL(value);
      return (
        url.protocol === 'https:' &&
        /^(www\.)?linkedin\.com$/i.test(url.hostname) &&
        /^\/in\/[^/]+\/?$/.test(url.pathname)
      );
    } catch {
      return false;
    }
  });

// CSV input on the MCP surface requires a LinkedIn URL column. Extract that
// column locally and use the API's documented linkedin_urls seed source.
export const linkedinSeedsFromCsv = (csv: string): string[] => {
  if (Buffer.byteLength(csv, 'utf8') > 2 * 1024 * 1024)
    throw createApiServiceError(
      'CSV text must be at most 2 MB. Supply up to 1,000 LinkedIn URLs.'
    );
  csv = csv.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  let closedQuote = false;
  const addRow = () => {
    row.push(cell);
    if (row.some(value => value.trim())) rows.push(row);
    if (rows.length > 1001)
      throw createApiServiceError('CSV text must contain at most 1,000 data rows.');
    row = [];
    cell = '';
    closedQuote = false;
  };
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (quoted) {
      if (char === '"') {
        if (csv[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closedQuote = true;
        }
      } else cell += char;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
      closedQuote = false;
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && csv[i + 1] === '\n') i++;
      addRow();
    } else if (char === '"' && cell === '' && !closedQuote) {
      quoted = true;
    } else {
      if (closedQuote || char === '"')
        throw createApiServiceError('CSV text contains invalid quoting.');
      cell += char;
    }
  }
  if (quoted) throw createApiServiceError('CSV text contains an unclosed quoted field.');
  if (cell || row.length || closedQuote) addRow();
  const header = rows.shift();
  const column =
    header?.findIndex(value =>
      ['linkedin', 'linkedinurl', 'linkedinprofile', 'profileurl'].includes(
        value
          .replace(/^\uFEFF/, '')
          .toLowerCase()
          .replace(/[ _-]/g, '')
      )
    ) ?? -1;
  if (column < 0 || rows.length === 0)
    throw createApiServiceError(
      'Provide a CSV header with a LinkedIn URL column and 1–1,000 data rows, or use linkedin_urls.'
    );
  return rows.map((values, index) => {
    const parsed = linkedinUrl.safeParse(values[column]?.trim());
    if (!parsed.success || values.length !== header?.length)
      throw createApiServiceError(
        `CSV data row ${index + 1} must have matching columns and a valid https://www.linkedin.com/in/ profile URL.`
      );
    return parsed.data;
  });
};

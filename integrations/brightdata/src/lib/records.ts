import { createApiServiceError, isApiErrorRecord } from 'slates';

// Scraper responses can be JSON, newline-delimited JSON, or CSV.
export let parseScrapedRecords = (
  data: unknown,
  format: string
): Record<string, unknown>[] => {
  let parsed: unknown = data;
  if (typeof data === 'string') {
    if (!data.trim()) return [];
    if (format === 'csv') return parseCsvRecords(data);
    try {
      parsed = JSON.parse(data);
    } catch {
      try {
        parsed = data
          .split(/\r?\n/)
          .filter(line => line.trim())
          .map(line => JSON.parse(line));
      } catch {
        throw createApiServiceError('Bright Data returned invalid scraped JSON data.');
      }
    }
  }
  let records = Array.isArray(parsed) ? parsed : [parsed];
  if (!records.every(isApiErrorRecord)) {
    throw createApiServiceError(
      'Bright Data returned scraped data that is not a list of records.'
    );
  }
  return records;
};

let parseCsvRecords = (content: string): Record<string, unknown>[] => {
  let rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let rowPresent = false;
  for (let index = 0; index < content.length; index++) {
    let char = content[index];
    if (char === '"') {
      rowPresent = true;
      if (quoted && content[index + 1] === '"') {
        field += '"';
        index++;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && (char === ',' || char === '\n' || char === '\r')) {
      row.push(field);
      field = '';
      if (char !== ',') {
        rows.push(row);
        row = [];
        rowPresent = false;
        if (char === '\r' && content[index + 1] === '\n') index++;
      } else {
        rowPresent = true;
      }
    } else {
      field += char;
      rowPresent = true;
    }
  }
  if (quoted) throw createApiServiceError('Bright Data returned an unterminated CSV field.');
  if (rowPresent) rows.push([...row, field]);
  let headers = rows.shift() ?? [];
  if (headers[0]) headers[0] = headers[0].replace(/^\uFEFF/, '');
  return rows
    .filter(
      values => values.length === headers.length || values.some(value => value.length > 0)
    )
    .map(values => {
      if (values.length !== headers.length) {
        throw createApiServiceError(
          'Bright Data returned a CSV row with an invalid column count.'
        );
      }
      return Object.fromEntries(headers.map((name, index) => [name, values[index]]));
    });
};

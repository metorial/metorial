import { createHash } from 'node:crypto';
import { buildApiServiceError, createApiServiceError, triggerGroup } from 'slates';
import { z } from 'zod';
import { SheetsClient } from '../lib/client';
import { spec } from '../spec';
import {
  type RowCell,
  type RowEvent,
  type RowState,
  rowEventSchema,
  rowSelectionSchema,
  rowStateSchema
} from './row-schemas';

const ROW_OBSERVATION_MAX_ROWS = 10_000;
const ROW_OBSERVATION_MAX_CELLS = 100_000;
const ROW_OBSERVATION_MAX_STATE_BYTES = 8 * 1024 * 1024;
const SKIPPED_ROW_SAMPLE = 5;

const fail = (message: string) =>
  createApiServiceError(message, { reason: 'google_sheets_row_observation' });
const rowList = (rows: number[]) =>
  `${rows.length === 1 ? 'row' : 'rows'} ${rows.slice(0, SKIPPED_ROW_SAMPLE).join(', ')}${
    rows.length > SKIPPED_ROW_SAMPLE ? ' and others' : ''
  }`;
const digest = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
const columnIndex = (column: string) =>
  [...column].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
const columnName = (index: number): string => {
  let name = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26))
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
};

const enteredValueSchema = z
  .object({
    stringValue: z.string().optional(),
    numberValue: z.number().finite().optional(),
    boolValue: z.boolean().optional(),
    formulaValue: z.string().optional()
  })
  .strict()
  .refine(value => Object.keys(value).length <= 1);
// https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/sheets#GridData
// https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/other#ExtendedValue
const gridResponseSchema = z.object({
  spreadsheetId: z.string(),
  sheets: z.array(
    z.object({
      properties: z.object({
        sheetId: z.number().int().nonnegative(),
        title: z.string(),
        sheetType: z.literal('GRID').optional(),
        gridProperties: z.object({
          rowCount: z.number().int().positive(),
          columnCount: z.number().int().positive()
        })
      }),
      data: z.array(
        z.object({
          startRow: z.number().int().nonnegative().optional(),
          startColumn: z.number().int().nonnegative().optional(),
          rowData: z
            .array(
              z.object({
                values: z
                  .array(z.object({ userEnteredValue: enteredValueSchema.optional() }))
                  .optional()
              })
            )
            .optional()
        })
      )
    })
  )
});

const normalizeCell = (cell: z.infer<typeof enteredValueSchema> | undefined): RowCell => {
  if (cell?.formulaValue !== undefined) return { formula: cell.formulaValue };
  if (cell?.numberValue !== undefined) return cell.numberValue;
  if (cell?.boolValue !== undefined) return cell.boolValue;
  return cell?.stringValue || null;
};

export const rowObservations = triggerGroup(spec, {
  key: 'row_observations',
  name: 'Row Observations',
  description:
    'Observe keyed rows in one selected table every 15 minutes. The first successful read establishes a silent baseline.',
  eventSchema: rowEventSchema,
  selectionSchema: rowSelectionSchema
})
  .polling({
    intervalSeconds: 900,
    pollEvents: async ctx => {
      const parsedSelection = rowSelectionSchema.safeParse(ctx.input.selection);
      if (!parsedSelection.success)
        throw fail(
          'Select a spreadsheet, sheet, bounded A1 range, and immutable key column before enabling row observations.'
        );
      const selection = parsedSelection.data;
      const match = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/.exec(selection.range);
      if (!match?.[1] || !match[3])
        throw fail('Select a bounded A1 range without a sheet name.');
      const startRowIndex = Number(match[2]) - 1;
      const endRowIndex = Number(match[4]);
      const startColumnIndex = columnIndex(match[1]);
      const endColumnIndex = columnIndex(match[3]) + 1;
      const height = endRowIndex - startRowIndex;
      const width = endColumnIndex - startColumnIndex;
      if (
        !Number.isSafeInteger(endRowIndex) ||
        height < 2 ||
        width < 1 ||
        height > ROW_OBSERVATION_MAX_ROWS ||
        height * width > ROW_OBSERVATION_MAX_CELLS
      ) {
        throw fail(
          'Select an ordered range containing a header and at least one data row, with at most 10,000 rows and 100,000 cells. No partial range is observed.'
        );
      }
      const columns = Array.from({ length: width }, (_, index) =>
        columnName(startColumnIndex + index)
      );
      const keyIndex = columns.indexOf(selection.keyColumn);
      const watchedColumns = [
        ...new Set(
          selection.watchedColumns ?? columns.filter(column => column !== selection.keyColumn)
        )
      ].sort((a, b) => columnIndex(a) - columnIndex(b));
      if (keyIndex < 0 || watchedColumns.some(column => !columns.includes(column)))
        throw fail(
          'The key column and every watched column must be inside the selected range.'
        );
      if (watchedColumns.includes(selection.keyColumn))
        throw fail('The immutable key column cannot be a watched column.');
      const watched = watchedColumns.map(column => ({
        column,
        index: columns.indexOf(column)
      }));

      let saved: RowState | null = null;
      if (ctx.input.state !== null && ctx.input.state !== undefined) {
        const parsed = rowStateSchema.safeParse(ctx.input.state);
        if (!parsed.success)
          throw fail(
            'The saved row baseline is invalid or uses an unsupported version. Reset this subscription to establish a new baseline.'
          );
        saved = parsed.data;
        if (
          saved.records.length > ROW_OBSERVATION_MAX_ROWS ||
          new Set(saved.records.map(record => record.token)).size !== saved.records.length ||
          saved.records.some(record => record.token !== JSON.stringify(record.key))
        )
          throw fail(
            'The saved row baseline contains invalid record identities. Reset this subscription to establish a new baseline.'
          );
      }

      let response: unknown;
      try {
        response = await new SheetsClient(ctx.auth.token).getRowObservationGrid(
          selection.spreadsheetId,
          {
            sheetId: selection.sheetId,
            range: selection.range
          }
        );
      } catch (error) {
        throw buildApiServiceError(error, {
          providerLabel: 'Google Sheets',
          operation: 'read selected row range',
          reason: 'google_sheets_row_read_failed'
        });
      }
      const parsed = gridResponseSchema.safeParse(response);
      if (!parsed.success)
        throw fail(
          'Google Sheets returned an invalid grid response. The previous baseline was preserved.'
        );
      const sheet = parsed.data.sheets[0];
      if (
        parsed.data.spreadsheetId !== selection.spreadsheetId ||
        parsed.data.sheets.length !== 1 ||
        !sheet ||
        sheet.properties.sheetId !== selection.sheetId
      )
        throw fail(
          'Google Sheets did not return exactly the selected spreadsheet and sheet. The previous baseline was preserved.'
        );
      const grid = sheet.data[0];
      if (
        sheet.data.length !== 1 ||
        !grid ||
        (grid.startRow ?? 0) !== startRowIndex ||
        (grid.startColumn ?? 0) !== startColumnIndex ||
        (grid.rowData?.length ?? 0) > height ||
        grid.rowData?.some(row => (row.values?.length ?? 0) > width)
      )
        throw fail(
          'Google Sheets returned a grid that does not match the selected range. No partial snapshot was accepted.'
        );
      // GridData omits trailing blanks and out-of-grid cells; both read as blank. Never slice a response.
      const rows = (grid.rowData ?? []).map(row =>
        columns.map((_, index) => normalizeCell(row.values?.[index]?.userEnteredValue))
      );
      const headers = rows[0];
      if (!headers || typeof headers[keyIndex] !== 'string' || !headers[keyIndex].trim())
        throw fail(
          'The first selected row must contain a nonblank text header for the key column.'
        );
      type Row = { key: string | number | boolean; values: RowCell[]; rowNumber: number };
      const rowsByKey = new Map<string, Row[]>();
      const skipped = { blank: [] as number[], formula: [] as number[] };
      for (const [index, values] of rows.entries()) {
        if (index === 0 || values.every(value => value === null)) continue;
        const rowNumber = startRowIndex + index + 1;
        const key = values[keyIndex];
        if (key === null || key === undefined || (typeof key === 'string' && !key.trim())) {
          skipped.blank.push(rowNumber);
          continue;
        }
        if (typeof key === 'object') {
          skipped.formula.push(rowNumber);
          continue;
        }
        const token = JSON.stringify(key);
        const sameKey = rowsByKey.get(token);
        if (sameKey) sameKey.push({ key, values, rowNumber });
        else rowsByKey.set(token, [{ key, values, rowNumber }]);
      }
      const current = new Map<string, Row>();
      const duplicated = new Map<string, number[]>();
      for (const [token, sameKey] of rowsByKey) {
        const [row] = sameKey;
        if (row && sameKey.length === 1) current.set(token, row);
        else
          duplicated.set(
            token,
            sameKey.map(candidate => candidate.rowNumber)
          );
      }

      // Columns are identified by letter; only the key column's header is part of the baseline identity.
      const fingerprint = digest({
        ...selection,
        watchedColumns,
        keyHeader: headers[keyIndex],
        comparison: 'user-entered-v1'
      });
      const rebaseline = !saved || saved.fingerprint !== fingerprint;
      const epoch = saved ? saved.epoch + (rebaseline ? 1 : 0) : 1;
      if (!Number.isSafeInteger(epoch))
        throw fail('The row baseline generation limit was reached. Reset this subscription.');
      const continued = !rebaseline && saved ? saved : null;
      const previousRecords = continued?.records ?? [];
      if (
        (continued && continued.headers.length !== width) ||
        previousRecords.some(
          record =>
            record.values.length !== width ||
            JSON.stringify(record.values[keyIndex]) !== record.token
        )
      )
        throw fail('The saved row baseline has invalid row values. Reset this subscription.');
      const previous = new Map(previousRecords.map(record => [record.token, record]));
      // A changed header usually means the column moved, so its differences are skipped for this read.
      const previousHeaders = continued?.headers ?? headers;
      const reheaded = watched.filter(
        ({ index }) =>
          JSON.stringify(previousHeaders[index]) !== JSON.stringify(headers[index])
      );
      const compared = watched.filter(column => !reheaded.includes(column));
      const startingFloor = continued?.revisionFloor ?? 0;
      let revisionFloor = startingFloor;
      const records = new Map<string, RowState['records'][number]>();
      for (const [token, record] of previous) {
        // A duplicated key keeps its last unambiguous snapshot until it is unique again.
        if (current.has(token) || duplicated.has(token)) records.set(token, record);
        else revisionFloor = Math.max(revisionFloor, record.revision);
      }
      const events: { payload: RowEvent; idempotencyKey: string }[] = [];
      const observedAt = new Date().toISOString();
      for (const [token, row] of current) {
        const before = previous.get(token);
        const beforeValues = before?.values ?? null;
        const changedColumns = beforeValues
          ? compared
              .filter(
                ({ index }) =>
                  JSON.stringify(beforeValues[index]) !== JSON.stringify(row.values[index])
              )
              .map(({ column }) => column)
          : [];
        const added = beforeValues === null;
        const emit = !rebaseline && (added || changedColumns.length > 0);
        const revision = (before?.revision ?? startingFloor) + (emit ? 1 : 0);
        if (!Number.isSafeInteger(revision))
          throw fail('A row revision limit was reached. Reset this subscription.');
        records.set(token, { token, key: row.key, revision, values: row.values });
        if (!emit) continue;
        const type = added ? 'row.added' : 'row.updated';
        const observationId = digest([
          selection.spreadsheetId,
          selection.sheetId,
          fingerprint,
          epoch,
          token,
          revision,
          type
        ]);
        const output = {
          observationId,
          spreadsheetId: selection.spreadsheetId,
          sheetId: selection.sheetId,
          sheetTitle: sheet.properties.title,
          range: selection.range,
          keyColumn: selection.keyColumn,
          key: row.key,
          rowNumber: row.rowNumber,
          columns,
          headers,
          values: row.values,
          revision,
          observedAt
        };
        const payload: RowEvent = beforeValues
          ? {
              type: 'row.updated',
              ...output,
              previousValues: beforeValues,
              changedColumns
            }
          : { type: 'row.added', ...output };
        events.push({ payload, idempotencyKey: observationId });
      }
      const updatedState: RowState = {
        schemaVersion: 1,
        fingerprint,
        epoch,
        revisionFloor,
        headers,
        records: [...records.values()]
      };
      if (Buffer.byteLength(JSON.stringify(updatedState)) > ROW_OBSERVATION_MAX_STATE_BYTES)
        throw fail(
          'The rows currently in the selected range hold more than 8 MiB of entered values. Select a smaller range; the previous baseline was kept.'
        );
      if (saved && rebaseline)
        ctx.warn({
          message:
            'row_selection_rebaselined: The selected range, key column, watched columns, or key column header changed. This successful read establishes a new silent baseline.'
        });
      if (reheaded.length)
        ctx.warn({
          message: `row_headers_changed: The header of watched ${
            reheaded.length === 1 ? 'column' : 'columns'
          } ${reheaded.map(({ column }) => column).join(', ')} changed. Value changes in ${
            reheaded.length === 1 ? 'that column' : 'those columns'
          } were not reported for this read; other columns and added rows were.`
        });
      const duplicateRows = [...duplicated.values()].flat().sort((a, b) => a - b);
      const skippedRows = skipped.blank.length + skipped.formula.length + duplicateRows.length;
      if (skippedRows) {
        const reasons = [
          skipped.blank.length &&
            `${skipped.blank.length} with a blank key (${rowList(skipped.blank)})`,
          skipped.formula.length &&
            `${skipped.formula.length} with a formula key (${rowList(skipped.formula)})`,
          duplicateRows.length &&
            `${duplicateRows.length} sharing a key with another row (${rowList(duplicateRows)})`
        ].filter(Boolean);
        ctx.warn({
          message: `row_keys_unusable: Skipped ${skippedRows} of the selected rows: ${reasons.join('; ')}. All other rows were observed.`,
          blankKeyRows: skipped.blank.length,
          formulaKeyRows: skipped.formula.length,
          duplicateKeyRows: duplicateRows.length
        });
      }
      return { events, updatedState };
    }
  })
  .routingMatchers(async () => [])
  .build();

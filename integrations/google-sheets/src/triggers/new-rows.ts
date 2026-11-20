import { createHash } from 'node:crypto';
import { buildApiServiceError, createApiServiceError, triggerGroup } from 'slates';
import { SheetsClient, type SheetTab, type SheetTabCell } from '../lib/client';
import { parseSpreadsheetReference } from '../lib/spreadsheet-reference';
import { spec } from '../spec';
import {
  type NewRowCell,
  type NewRowEvent,
  type NewRowState,
  newRowSchema,
  newRowSelectionSchema,
  newRowStateSchema
} from './row-schemas';
import { spreadsheetSelection, tabOptions } from './selection-options';

// Rows beyond this wait for the next check, so a large paste arrives over several checks.
export const NEW_ROWS_MAX_PER_POLL = 500;
// Each read covers at most ROWS_PER_READ rows and a check makes at most READS_PER_POLL of them,
// so a long empty stretch, or the first count of a long tab, continues over several checks.
export const ROWS_PER_READ = 2000;
export const READS_PER_POLL = 5;

type RowEvent = { payload: NewRowEvent; idempotencyKey: string };

const fail = (message: string) =>
  createApiServiceError(message, { reason: 'google_sheets_new_rows' });

const isBlank = (cell: SheetTabCell | undefined) => cell === undefined || cell === '';

const lastFilledIndex = (rows: SheetTabCell[][]) => {
  let index = rows.length - 1;
  while (index >= 0 && rows[index]!.every(isBlank)) index--;
  return index;
};

const resolveTab = (
  tabs: SheetTab[],
  chosenSheetId: number | undefined,
  defaultedSheetId: number | undefined
) => {
  if (chosenSheetId !== undefined) {
    const chosen = tabs.find(tab => tab.sheetId === chosenSheetId);
    if (!chosen)
      throw fail('The selected tab is no longer in this spreadsheet. Choose another tab.');
    if (!chosen.isGrid)
      throw fail('The selected tab is a chart, not a sheet with rows. Choose another tab.');
    return chosen;
  }
  // Without a chosen tab the first one is used, then kept even if the tabs are reordered.
  const tab =
    tabs.find(candidate => candidate.isGrid && candidate.sheetId === defaultedSheetId) ??
    tabs.find(candidate => candidate.isGrid);
  if (!tab) throw fail('This spreadsheet has no tab with rows.');
  return tab;
};

export const newRows = triggerGroup(spec, {
  key: 'new_rows',
  name: 'New Row',
  description:
    'Fires when a row is added below the last filled row of a sheet. Checked every 15 minutes. Rows already in the sheet when you turn this on are not reported, and a row added shortly after rows were deleted can be missed.',
  eventSchema: newRowSchema,
  selectionSchema: newRowSelectionSchema
})
  .polling({
    intervalSeconds: 900,
    pollEvents: async ctx => {
      const selection = newRowSelectionSchema.safeParse(ctx.input.selection);
      if (!selection.success)
        throw fail('Choose a spreadsheet before turning on this trigger.');
      const reference = parseSpreadsheetReference(selection.data.spreadsheetId);
      const spreadsheetId = reference.spreadsheetId;
      const savedState = newRowStateSchema.safeParse(ctx.input.state);
      // The epoch carries over from any saved state, so returning to a tab never repeats event IDs.
      const previous = savedState.success ? savedState.data : null;
      const sameSpreadsheet = previous?.spreadsheetId === spreadsheetId ? previous : null;

      const client = new SheetsClient(ctx.auth.token);
      const read = async <T>(operation: string, request: () => Promise<T>) => {
        try {
          return await request();
        } catch (error) {
          throw buildApiServiceError(error, {
            providerLabel: 'Google Sheets',
            operation,
            reason: 'google_sheets_new_rows_read_failed'
          });
        }
      };
      const chosenSheetId = selection.data.sheetId ?? reference.sheetId;
      const tabChosen = chosenSheetId !== undefined;
      const tab = resolveTab(
        await read('list tabs', () => client.listTabs(spreadsheetId)),
        chosenSheetId,
        sameSpreadsheet?.tabChosen === false ? sameSpreadsheet.sheetId : undefined
      );

      let reads = 0;
      const readRows = (operation: string, ranges: string[]) => {
        reads++;
        return read(operation, () => client.getTabRows(spreadsheetId, tab.title, ranges));
      };
      const done = (
        epoch: number,
        position: Pick<NewRowState, 'rowsSeen' | 'scannedTo' | 'countFrom'>,
        events: RowEvent[] = []
      ) => {
        const updatedState: NewRowState = {
          schemaVersion: 2,
          spreadsheetId,
          sheetId: tab.sheetId,
          tabChosen,
          epoch,
          rowCount: tab.rowCount,
          ...position
        };
        return { events, updatedState };
      };

      // Google has no row counter, so the last filled row is found by reading upwards from `from`.
      const count = async (epoch: number, from: number) => {
        let top = Math.min(from, tab.rowCount);
        while (top > 0) {
          if (reads === READS_PER_POLL)
            return done(epoch, { rowsSeen: 0, scannedTo: 0, countFrom: top });
          const first = Math.max(1, top - ROWS_PER_READ + 1);
          const [rows] = await readRows('count rows', [`${first}:${top}`]);
          const filled = lastFilledIndex(rows ?? []);
          if (filled >= 0) {
            top = first + filled;
            break;
          }
          top = first - 1;
        }
        return done(epoch, { rowsSeen: top, scannedTo: top });
      };

      const saved = sameSpreadsheet?.sheetId === tab.sheetId ? sameSpreadsheet : null;
      if (!saved) return count((previous?.epoch ?? 0) + 1, tab.rowCount);
      if (saved.countFrom !== undefined) return count(saved.epoch, saved.countFrom);
      // A shorter grid means rows were deleted, wherever they were.
      if (tab.rowCount < saved.rowCount) return count(saved.epoch + 1, saved.rowsSeen);

      const { epoch, rowsSeen } = saved;
      const first = Math.max(rowsSeen, 1);
      const last = Math.min(first + ROWS_PER_READ - 1, tab.rowCount);
      if (first > last) return done(epoch, { rowsSeen, scannedTo: saved.scannedTo });
      const [headerRows, nearRows] = await readRows('read new rows', [
        '1:1',
        `${first}:${last}`
      ]);
      // The read starts on the last row seen: once that row is empty, rows were removed.
      if (rowsSeen > 0 && (nearRows?.[0] ?? []).every(isBlank))
        return count(epoch + 1, rowsSeen);

      const headers = (headerRows?.[0] ?? []).map(cell => String(cell).trim() || null);
      const observedAt = new Date().toISOString();
      const toEvent = (rowNumber: number, cells: SheetTabCell[]): RowEvent => {
        const width = Math.max(headers.length, cells.length);
        const values = Array.from(
          { length: width },
          (_, index): NewRowCell => (isBlank(cells[index]) ? null : cells[index]!)
        );
        const named = new Map<string, NewRowCell>();
        for (const [index, header] of headers.entries())
          if (header !== null && !named.has(header)) named.set(header, values[index] ?? null);
        const eventId = createHash('sha256')
          .update(JSON.stringify([spreadsheetId, tab.sheetId, epoch, rowNumber]))
          .digest('hex');
        return {
          payload: {
            type: 'row.new',
            eventId,
            spreadsheetId,
            sheetId: tab.sheetId,
            sheetTitle: tab.title,
            rowNumber,
            headers: Array.from({ length: width }, (_, index) => headers[index] ?? null),
            values,
            row: Object.fromEntries(named),
            observedAt
          },
          idempotencyKey: eventId
        };
      };
      // The header row counts as seen but is never reported.
      const report = (rows: SheetTabCell[][], firstRow: number) => {
        const events: RowEvent[] = [];
        let lastTaken = 0;
        for (const [offset, cells] of rows.entries()) {
          const rowNumber = firstRow + offset;
          if (rowNumber <= rowsSeen || cells.every(isBlank)) continue;
          if (events.length === NEW_ROWS_MAX_PER_POLL)
            return { events, lastTaken, more: true };
          lastTaken = rowNumber;
          if (rowNumber > 1) events.push(toEvent(rowNumber, cells));
        }
        return { events, lastTaken, more: false };
      };

      let found = report(nearRows ?? [], first);
      let scannedTo = Math.max(last, saved.scannedTo);
      if (!found.lastTaken) {
        // Past an empty stretch longer than one read, the search resumes where the last check
        // stopped, and starts over below the first read once it has reached the end of the grid.
        if (scannedTo >= tab.rowCount) scannedTo = last;
        while (!found.lastTaken && scannedTo < tab.rowCount && reads < READS_PER_POLL) {
          const from = scannedTo + 1;
          scannedTo = Math.min(scannedTo + ROWS_PER_READ, tab.rowCount);
          const [rows] = await readRows('read new rows', [`${from}:${scannedTo}`]);
          found = report(rows ?? [], from);
        }
      }
      if (!found.lastTaken) return done(epoch, { rowsSeen, scannedTo });
      return done(
        epoch,
        { rowsSeen: found.lastTaken, scannedTo: found.more ? found.lastTaken : scannedTo },
        found.events
      );
    }
  })
  .routingMatchers(async () => [])
  .selectionOptions({ spreadsheetId: spreadsheetSelection, sheetId: { list: tabOptions } })
  .build();

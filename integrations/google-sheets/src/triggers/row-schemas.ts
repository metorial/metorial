import { z } from 'zod';

const newRowCellSchema = z.union([z.string(), z.number().finite(), z.boolean(), z.null()]);
export type NewRowCell = z.infer<typeof newRowCellSchema>;

export const newRowSelectionSchema = z.object({
  spreadsheetId: z.string().trim().min(1).meta({
    title: 'Spreadsheet',
    description: 'The spreadsheet to watch. Pick one from the list, or paste its link or ID.'
  }),
  sheetId: z.number().int().nonnegative().optional().meta({
    title: 'Tab',
    description: 'The tab to watch. Leave empty to use the first tab of the spreadsheet.'
  })
});

export const newRowSchema = z.object({
  type: z.literal('row.new'),
  eventId: z.string(),
  spreadsheetId: z.string(),
  sheetId: z.number().int().nonnegative(),
  sheetTitle: z.string(),
  rowNumber: z
    .number()
    .int()
    .positive()
    .describe('Position of the row in the tab; 1 is the header row.'),
  headers: z
    .array(z.string().nullable())
    .describe(
      'Text of the first row of the tab, one entry per column. Empty header cells are null.'
    ),
  values: z
    .array(newRowCellSchema)
    .describe(
      'Cells of the new row in column order, as shown in the sheet for dates and as calculated for formulas. Empty cells are null.'
    ),
  row: z
    .record(z.string(), newRowCellSchema)
    .describe(
      'The same cells by header text. Columns with an empty header are left out. When several columns share a header, the leftmost one is used.'
    ),
  observedAt: z.iso.datetime().describe('Time the row was read, not the time it was added.')
});
export type NewRowEvent = z.infer<typeof newRowSchema>;

// Counters and identifiers only; nothing read from the cells is saved.
export const newRowStateSchema = z.object({
  schemaVersion: z.literal(2),
  spreadsheetId: z.string().min(1),
  sheetId: z.number().int().nonnegative(),
  // False while the tab is the default first tab rather than one the person picked.
  tabChosen: z.boolean(),
  // Row numbers are reused after rows are removed, so each new count gets its own event IDs.
  epoch: z.number().int().positive(),
  // Grid rows at the last check: fewer rows now means rows were deleted.
  rowCount: z.number().int().nonnegative(),
  // The last row reported or counted; rows at or above it are never reported.
  rowsSeen: z.number().int().nonnegative(),
  // Rows below rowsSeen were empty down to this row when last read; the search for rows after a gap resumes here.
  scannedTo: z.number().int().nonnegative(),
  // Present while the rows already in the tab are being counted, from this row upwards.
  countFrom: z.number().int().nonnegative().optional()
});
export type NewRowState = z.infer<typeof newRowStateSchema>;

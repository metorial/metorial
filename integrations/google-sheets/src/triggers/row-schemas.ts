import { z } from 'zod';

const column = z.string().regex(/^[A-Z]{1,3}$/);

export const rowSelectionSchema = z.object({
  spreadsheetId: z
    .string()
    .min(1)
    .describe('Spreadsheet ID from its URL or an existing spreadsheet tool result.'),
  sheetId: z
    .number()
    .int()
    .nonnegative()
    .describe('Stable numeric tab ID returned by Get Spreadsheet.'),
  range: z
    .string()
    .regex(/^[A-Z]{1,3}[1-9]\d*:[A-Z]{1,3}[1-9]\d*$/)
    .describe(
      'Bounded A1 range without a tab name, for example A1:D1000. Its first row contains headers. At most 10,000 rows and 100,000 cells; rows outside it are not observed. It may extend past the last row or column the sheet currently has.'
    ),
  keyColumn: column.describe(
    'Absolute column letter containing a unique, nonblank, immutable text, number, or boolean key for every record. Rows whose key is blank, a formula, or shared with another row are skipped until the key is fixed.'
  ),
  watchedColumns: z
    .array(column)
    .min(1)
    .optional()
    .describe(
      'Absolute column letters whose entered values or formula expressions should produce update events. Defaults to all selected columns except the key column.'
    )
});

// Formula objects keep a literal text value such as "=A1" distinct from a formula.
const rowCellSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null(),
  z.object({ formula: z.string() }).strict()
]);
export type RowCell = z.infer<typeof rowCellSchema>;
const rowKeySchema = z.union([z.string().min(1), z.number().finite(), z.boolean()]);

const rowOutput = {
  observationId: z.string(),
  spreadsheetId: z.string(),
  sheetId: z.number().int().nonnegative(),
  sheetTitle: z.string(),
  range: z.string(),
  keyColumn: z.string(),
  key: rowKeySchema,
  rowNumber: z
    .number()
    .int()
    .positive()
    .describe('Current one-based position, not record identity.'),
  columns: z.array(z.string()),
  headers: z.array(rowCellSchema),
  values: z
    .array(rowCellSchema)
    .describe(
      'Entered cell values aligned with columns; blank cells are null and formulas are objects containing formula.'
    ),
  revision: z
    .number()
    .int()
    .positive()
    .describe(
      'Increases with every reported observation of this key and is never reused for it. Not necessarily consecutive or starting at 1.'
    ),
  observedAt: z.iso
    .datetime()
    .describe('Time this snapshot was read, not the time of an edit.')
};
export const rowAddedSchema = z.object({ type: z.literal('row.added'), ...rowOutput });
export const rowUpdatedSchema = z.object({
  type: z.literal('row.updated'),
  ...rowOutput,
  previousValues: z.array(rowCellSchema),
  changedColumns: z.array(z.string()).min(1)
});
export const rowEventSchema = z.discriminatedUnion('type', [rowAddedSchema, rowUpdatedSchema]);
export type RowEvent = z.infer<typeof rowEventSchema>;

const revision = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

export const rowStateSchema = z.object({
  schemaVersion: z.literal(1),
  fingerprint: z.string(),
  epoch: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  // Removed keys are not remembered. This is the highest revision any removed key
  // reached; a key without a record starts above it, so it cannot reuse an event ID.
  revisionFloor: revision,
  headers: z.array(rowCellSchema),
  records: z.array(
    z.object({
      token: z.string(),
      key: rowKeySchema,
      revision,
      values: z.array(rowCellSchema)
    })
  )
});
export type RowState = z.infer<typeof rowStateSchema>;

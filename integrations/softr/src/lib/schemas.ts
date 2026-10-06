import { fail, id, parse, type Row, z } from './validation';

const timestamp = z.string().optional();
export const databaseOutput = z.object({
  databaseId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  workspaceId: z.string(),
  tablesCount: z.number().optional(),
  createdAt: timestamp,
  updatedAt: timestamp
});
export const fieldOutput = z.object({
  fieldId: z.string(),
  name: z.string(),
  type: z.string(),
  description: z.string().nullable().optional(),
  allowMultipleEntries: z.boolean().optional(),
  readonly: z.boolean().optional(),
  required: z.boolean().optional(),
  locked: z.boolean().optional(),
  defaultValue: z.string().nullable().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
  createdAt: timestamp,
  updatedAt: timestamp
});
export const tableOutput = z.object({
  tableId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  primaryFieldId: z.string().optional(),
  defaultViewId: z.string().optional(),
  fields: z.array(fieldOutput),
  createdAt: timestamp,
  updatedAt: timestamp
});
export const recordOutput = z.object({
  recordId: z.string(),
  tableId: z.string(),
  fields: z.record(z.string(), z.unknown()),
  createdAt: timestamp,
  updatedAt: timestamp
});
const nativeId = z
  .string()
  .min(1)
  .refine(v => v !== '[redacted]', 'Credential-bearing identity is unusable');
const base = { id: nativeId, createdAt: timestamp, updatedAt: timestamp };
export const nativeDatabase = z
  .object({
    ...base,
    name: z.string(),
    description: z.string().nullable().optional(),
    workspaceId: nativeId,
    tablesCount: z.number().int().nonnegative().refine(Number.isSafeInteger).optional()
  })
  .passthrough();
export const nativeField = z
  .object({
    ...base,
    name: z.string(),
    type: z.string(),
    description: z.string().nullable().optional(),
    allowMultipleEntries: z.boolean().optional(),
    readonly: z.boolean().optional(),
    required: z.boolean().optional(),
    locked: z.boolean().optional(),
    defaultValue: z.string().nullable().optional(),
    options: z.record(z.string(), z.unknown()).optional()
  })
  .passthrough();
export const nativeTable = z
  .object({
    ...base,
    name: z.string(),
    description: z.string().nullable().optional(),
    primaryFieldId: z.string().optional(),
    defaultViewId: z.string().optional(),
    fields: z.array(nativeField)
  })
  .passthrough();
export const nativeRecord = z
  .object({ ...base, tableId: nativeId, fields: z.record(z.string(), z.unknown()) })
  .passthrough();
export const nativeView = z
  .object({
    ...base,
    tableId: nativeId,
    name: z.string(),
    description: z.string().nullable().optional()
  })
  .passthrough();
export const pageMetadata = z
  .object({
    offset: z.number().int().nonnegative().refine(Number.isSafeInteger),
    limit: z.number().int().min(1).max(200),
    total: z.number().int().nonnegative().refine(Number.isSafeInteger)
  })
  .passthrough();
export const dbId = z
  .string()
  .describe('Database ID. Call list_databases to discover authorized databases.');
export const tblId = z.string().describe('Table ID. Call list_tables with the database ID.');
export const mappedDatabase = (v: z.infer<typeof nativeDatabase>) => ({
  databaseId: v.id,
  name: v.name,
  description: v.description ?? null,
  workspaceId: v.workspaceId,
  tablesCount: v.tablesCount,
  createdAt: v.createdAt,
  updatedAt: v.updatedAt
});
export const mappedField = (v: z.infer<typeof nativeField>) => ({
  fieldId: v.id,
  name: v.name,
  type: v.type,
  description: v.description,
  allowMultipleEntries: v.allowMultipleEntries,
  readonly: v.readonly,
  required: v.required,
  locked: v.locked,
  defaultValue: v.defaultValue,
  options: v.options,
  createdAt: v.createdAt,
  updatedAt: v.updatedAt
});
export const mappedTable = (v: z.infer<typeof nativeTable>) => ({
  tableId: v.id,
  name: v.name,
  description: v.description ?? null,
  primaryFieldId: v.primaryFieldId,
  defaultViewId: v.defaultViewId,
  fields: v.fields.map(mappedField),
  createdAt: v.createdAt,
  updatedAt: v.updatedAt
});
export const mappedRecord = (v: z.infer<typeof nativeRecord>) => ({
  recordId: v.id,
  tableId: v.tableId,
  fields: v.fields,
  createdAt: v.createdAt,
  updatedAt: v.updatedAt
});
export function single<T>(schema: z.ZodType<T>, raw: unknown) {
  return parse(z.object({ data: schema }).passthrough(), raw).data;
}
export function collection<T>(schema: z.ZodType<T>, raw: unknown) {
  const result = parse(
    z
      .object({
        data: z.array(schema).max(1000),
        metadata: z
          .object({ total: z.number().int().nonnegative().refine(Number.isSafeInteger) })
          .passthrough()
          .nullish()
      })
      .passthrough(),
    raw
  );
  if (result.metadata && result.metadata.total !== result.data.length)
    fail(
      'Softr returned an incomplete collection on a route without documented paging parameters. Refusing to infer absence.',
      'incomplete_response'
    );
  return result.data;
}
export function exact<T extends { id: string }>(v: T, expected: string) {
  if (v.id !== id(expected))
    fail(
      'Softr returned a different resource ID. Reconcile the exact scope before any retry.',
      'identity_mismatch'
    );
  return v;
}
export function exactRecord(
  v: z.infer<typeof nativeRecord>,
  tableId: string,
  recordId?: string
) {
  if (v.tableId !== id(tableId) || (recordId !== undefined && v.id !== id(recordId)))
    fail('Softr returned a record outside the exact requested identity.', 'identity_mismatch');
  return v;
}
export function page(
  raw: unknown,
  tableId: string,
  requested: { offset: number; limit: number }
) {
  const p = parse(
    z.object({ data: z.array(nativeRecord).max(200), metadata: pageMetadata }).passthrough(),
    raw
  );
  if (
    p.metadata.offset !== requested.offset ||
    p.metadata.limit !== requested.limit ||
    p.data.length > p.metadata.limit ||
    (p.metadata.total < p.metadata.offset + p.data.length && p.data.length > 0) ||
    new Set(p.data.map(r => r.id)).size !== p.data.length
  )
    fail(
      'Softr returned contradictory page metadata or duplicate IDs. Do not infer completion.',
      'invalid_page'
    );
  for (const r of p.data) exactRecord(r, tableId);
  const next = p.metadata.offset + p.data.length;
  const hasMore = next < p.metadata.total;
  if (hasMore && p.data.length === 0)
    fail(
      'Softr returned an empty incomplete page. Reconcile pagination before continuing.',
      'invalid_page'
    );
  return {
    ...p.metadata,
    records: p.data.map(mappedRecord),
    hasMore,
    nextOffset: hasMore ? next : undefined
  };
}
export type Condition = {
  operator: string;
  field?: string;
  value?: unknown;
  values?: unknown[];
  conditions?: Condition[];
  leftSide?: string;
  rightSide?: unknown;
  lowerBound?: unknown;
  upperBound?: unknown;
};
export const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.object({
    operator: z.string(),
    field: z.string().optional(),
    value: z.unknown().optional(),
    values: z.array(z.unknown()).optional(),
    conditions: z.array(conditionSchema).optional(),
    leftSide: z.string().optional(),
    rightSide: z.unknown().optional(),
    lowerBound: z.unknown().optional(),
    upperBound: z.unknown().optional()
  })
);
const arrayOperators = new Set([
  'IS_ONE_OF',
  'IS_NOT_ONE_OF',
  'HAS_ANY_OF',
  'HAS_ALL_OF',
  'HAS_NONE_OF'
]);
const binary = new Set([
  'IS',
  'IS_NOT',
  'GREATER_THAN',
  'GREATER_THAN_OR_EQUALS',
  'LESS_THAN',
  'LESS_THAN_OR_EQUALS',
  'CONTAINS',
  'DOES_NOT_CONTAIN',
  'STARTS_WITH',
  'DOES_NOT_START_WITH',
  'ENDS_WITH',
  'DOES_NOT_END_WITH',
  ...arrayOperators
]);
export function nativeCondition(c: Condition, depth = 0): Row {
  if (depth > 12) fail('Use at most twelve nested filter levels.');
  const op = c.operator;
  if (op === 'AND' || op === 'OR') {
    if (
      !c.conditions?.length ||
      c.conditions.length > 50 ||
      [c.field, c.leftSide, c.value, c.values, c.rightSide, c.lowerBound, c.upperBound].some(
        v => v !== undefined
      )
    )
      fail('Composite AND/OR filters accept only a nonempty bounded conditions array.');
    return { operator: op, conditions: c.conditions.map(v => nativeCondition(v, depth + 1)) };
  }
  if (c.conditions !== undefined) fail('Nested conditions belong only to AND/OR filters.');
  if (c.field !== undefined && c.leftSide !== undefined && c.field !== c.leftSide)
    fail('Legacy field and native leftSide must agree; provide one locator.');
  const field = id(c.leftSide ?? c.field, 'filter field ID');
  const supplied = [c.value, c.values, c.rightSide].filter(v => v !== undefined);
  if (supplied.length > 1) fail('Provide only one of value, values or rightSide.');
  const right = supplied[0];
  if (op === 'IS_EMPTY' || op === 'IS_NOT_EMPTY') {
    if (right !== undefined || c.lowerBound !== undefined || c.upperBound !== undefined)
      fail('Unary filters accept no comparison value.');
    return { operator: op, leftSide: field };
  }
  if (['IS_BETWEEN', 'IS_NOT_BETWEEN', 'IS_WITHIN', 'IS_NOT_WITHIN'].includes(op)) {
    if (right !== undefined && (c.lowerBound !== undefined || c.upperBound !== undefined))
      fail('Provide native bounds or a legacy two-value array, without mixing.');
    const lower =
        c.lowerBound ?? (Array.isArray(right) && right.length === 2 ? right[0] : undefined),
      upper =
        c.upperBound ?? (Array.isArray(right) && right.length === 2 ? right[1] : undefined);
    if (
      !['string', 'number'].includes(typeof lower) ||
      !['string', 'number'].includes(typeof upper)
    )
      fail('Range filters require lowerBound and upperBound, or exactly two legacy values.');
    return { operator: op, leftSide: field, lowerBound: lower, upperBound: upper };
  }
  if (
    !binary.has(op) ||
    right === undefined ||
    c.lowerBound !== undefined ||
    c.upperBound !== undefined
  )
    fail('Use a documented binary filter operator and comparison value.');
  if (arrayOperators.has(op) && (!Array.isArray(right) || !right.length))
    fail('Array operators require a nonempty comparison array.');
  if (!arrayOperators.has(op) && !['string', 'number', 'boolean'].includes(typeof right))
    fail('Binary comparison requires a string, number or boolean.');
  return { operator: op, leftSide: field, rightSide: right };
}

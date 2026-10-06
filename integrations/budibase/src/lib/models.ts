import { z } from 'zod';
import { appId, malformed, object, pathId } from './validation';

export const applicationSchema = z.object({
  appId: z
    .string()
    .describe('Native application/workspace ID; app_metadata is not a usable workspace ID.'),
  name: z.string(),
  url: z.string(),
  status: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  version: z.string().optional(),
  tenantId: z.string().optional()
});
export const tableSchema = z.object({
  tableId: z.string(),
  name: z.string(),
  primaryDisplay: z.string().optional(),
  schema: z.record(z.string(), z.unknown()).optional()
});
export const userSchema = z.object({
  userId: z.string(),
  email: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  status: z.string().optional(),
  builder: z.object({ global: z.boolean().optional() }).optional(),
  admin: z.object({ global: z.boolean().optional() }).optional(),
  roles: z.record(z.string(), z.string()).optional()
});
export const querySchema = z.object({
  queryId: z.string(),
  name: z.string().optional(),
  datasourceId: z.string().optional(),
  parameters: z.array(z.unknown()).optional(),
  queryVerb: z.string().optional()
});
const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) return malformed();
  return result.data;
};
export const mapApplication = (value: unknown, expected?: string) => {
  const packageData = object(value);
  const row =
    packageData.application === undefined ? packageData : object(packageData.application);
  const nativeId = row.appId ?? row._id;
  const id = appId(nativeId);
  if (expected !== undefined && id !== expected) malformed();
  return parse(applicationSchema, { ...row, appId: id });
};
export const mapTable = (value: unknown, expected?: string) => {
  const row = object(value);
  const id = pathId(row._id, 'Native table ID');
  if (expected !== undefined && id !== expected) malformed();
  return parse(tableSchema, { ...row, tableId: id });
};
export const mapUser = (value: unknown, expected?: string) => {
  const row = object(value);
  const id = pathId(row._id, 'Native user ID');
  if (expected !== undefined && id !== expected) malformed();
  return parse(userSchema, { ...row, userId: id });
};
export const mapQuery = (value: unknown) => {
  const row = object(value);
  return parse(querySchema, { ...row, queryId: pathId(row._id, 'Native query ID') });
};
export const bindRow = (value: unknown, tableId: string, rowId?: string) => {
  const row = object(value);
  const id = pathId(row._id, 'Native row ID');
  if (row.tableId !== tableId || (rowId !== undefined && id !== rowId)) malformed();
  return row;
};

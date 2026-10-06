import { z } from 'zod';
import { invalid } from './validation';

const resourceId = z.string().min(1);
const numberId = z.number().int().positive().safe();
export const recipientSchema = z.object({
  id: numberId,
  envelopeId: resourceId,
  email: z.string(),
  name: z.string(),
  role: z.string(),
  signingStatus: z.string(),
  signingOrder: z.number().int().nonnegative().nullable().optional()
});
export const recipientMap = (r: z.infer<typeof recipientSchema>) => ({
  recipientId: r.id,
  email: r.email,
  name: r.name,
  role: r.role,
  signingStatus: r.signingStatus,
  signingOrder: r.signingOrder ?? undefined
});
export function decimal(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(value))
    throw invalid('Documenso returned an invalid field coordinate.');
  const result = Number(value),
    scale = value.split('.')[1]?.length ?? 0;
  const normalized = (s: string) =>
    s
      .replace(/^(-?)0+(?=\d)/, '$1')
      .replace(/(\.\d*?)0+$/, '$1')
      .replace(/\.$/, '')
      .replace(/^-0$/, '0');
  if (
    !Number.isFinite(result) ||
    scale > 100 ||
    normalized(result.toFixed(scale)) !== normalized(value)
  )
    throw invalid(
      'Documenso returned a field coordinate that cannot be represented accurately.'
    );
  return result;
}
const coordinate = z.union([z.number(), z.string()]).transform(decimal);
export const fieldSchema = z.object({
  id: numberId,
  envelopeId: resourceId,
  envelopeItemId: resourceId,
  recipientId: numberId,
  type: z.string(),
  page: z.number().int().positive().safe(),
  positionX: coordinate,
  positionY: coordinate,
  width: coordinate,
  height: coordinate,
  fieldMeta: z.record(z.string(), z.unknown()).nullable().optional()
});
export type Field = z.infer<typeof fieldSchema>;
export const fieldMap = (f: Field) => ({
  fieldId: f.id,
  type: f.type,
  pageNumber: f.page,
  pageX: f.positionX,
  pageY: f.positionY,
  width: f.width,
  height: f.height,
  envelopeItemId: f.envelopeItemId,
  recipientId: f.recipientId
});
export const itemSchema = z.object({
  id: resourceId,
  envelopeId: resourceId,
  title: z.string(),
  order: z.number().int().nonnegative().safe()
});
export const summarySchema = z.object({
  id: resourceId,
  title: z.string(),
  status: z.string(),
  type: z.enum(['DOCUMENT', 'TEMPLATE']),
  createdAt: z.string(),
  updatedAt: z.string(),
  externalId: z.string().nullable().optional(),
  folderId: resourceId.nullable().optional(),
  teamId: numberId,
  userId: numberId,
  deletedAt: z.string().nullable().optional()
});
export const summaryMap = (e: z.infer<typeof summarySchema>) => ({
  envelopeId: e.id,
  title: e.title,
  status: e.status,
  type: e.type,
  createdAt: e.createdAt,
  updatedAt: e.updatedAt,
  externalId: e.externalId ?? undefined,
  folderId: e.folderId ?? undefined,
  teamId: e.teamId,
  ownerId: e.userId
});
export const envelopeSchema = summarySchema.extend({
  internalVersion: z.number().int().positive().safe(),
  recipients: z.array(recipientSchema),
  fields: z.array(fieldSchema),
  envelopeItems: z.array(itemSchema),
  documentMeta: z
    .object({
      subject: z.string().nullable().optional(),
      message: z.string().nullable().optional(),
      distributionMethod: z.enum(['EMAIL', 'NONE']).optional()
    })
    .nullable()
    .optional()
});
export type Envelope = z.infer<typeof envelopeSchema>;
export const folderSchema = z.object({
  id: resourceId,
  name: z.string(),
  parentId: resourceId.nullable(),
  type: z.enum(['DOCUMENT', 'TEMPLATE']),
  teamId: numberId,
  userId: numberId
});
export const folderMap = (f: z.infer<typeof folderSchema>) => ({
  folderId: f.id,
  name: f.name,
  parentFolderId: f.parentId ?? undefined,
  type: f.type,
  teamId: f.teamId,
  ownerId: f.userId
});
export const auditSchema = z.object({
  id: resourceId,
  envelopeId: resourceId,
  type: z.string(),
  createdAt: z.string(),
  userAgent: z.string().nullable().optional(),
  ipAddress: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional()
});
export const pageSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    data: z.array(item),
    count: z.number().int().nonnegative().safe(),
    currentPage: z.number().int().positive().safe(),
    perPage: z.number().int().positive().max(100).safe(),
    totalPages: z.number().int().nonnegative().safe()
  });
export const pageMap = (p: {
  count: number;
  currentPage: number;
  perPage: number;
  totalPages: number;
}) => ({
  totalCount: p.count,
  currentPage: p.currentPage,
  perPage: p.perPage,
  totalPages: p.totalPages,
  nextPage: p.currentPage < p.totalPages ? p.currentPage + 1 : undefined
});

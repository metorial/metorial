import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let invalid = (message: string) =>
  createApiServiceError(message, { reason: 'slite_validation' });
export let malformed = () =>
  createApiServiceError(
    'Slite returned an invalid or inconsistent receipt. A preceding write may already have happened; inspect the exact resource before retrying.',
    { reason: 'slite_response', parent: {} }
  );
export let resourceId = z
  .string()
  .min(1)
  .max(300)
  .refine(
    value =>
      value.trim() === value &&
      value !== '.' &&
      value !== '..' &&
      !Array.from(value).some(char => {
        const point = char.codePointAt(0) ?? 0;
        return point <= 32 || point === 127 || (point >= 0xd800 && point <= 0xdfff);
      }),
    'Provide the exact nonempty resource ID.'
  );
export let count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
export let pageInput = count.optional();
export let pageSizeInput = z.number().int().min(1).max(100).optional();
export let ownerSchema = z
  .object({ userId: resourceId.optional(), groupId: resourceId.optional() })
  .refine(value => !(value.userId && value.groupId));
export let noteSchema = z
  .object({
    id: resourceId,
    title: z.string(),
    url: z.string(),
    parentNoteId: resourceId.nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    lastEditedAt: z.string(),
    archivedAt: z.string().nullable(),
    reviewState: z.string().optional(),
    owner: ownerSchema.optional(),
    columns: z.array(z.string()).optional(),
    attributes: z.array(z.string()).optional(),
    listPosition: z.number().nullable().optional()
  })
  .passthrough();
export let noteContentSchema = noteSchema.extend({ content: z.string() });
export type Note = z.output<typeof noteSchema>;
export let notePageSchema = z.object({
  notes: z.array(noteSchema),
  total: count,
  hasNextPage: z.boolean(),
  nextCursor: z.string().nullable()
});
export let meSchema = z.object({
  email: z.string(),
  displayName: z.string(),
  organizationName: z.string(),
  organizationDomain: z.string()
});
export let userSchema = z.object({
  id: resourceId,
  email: z.string(),
  displayName: z.string(),
  organizationRole: z.string().optional(),
  isGuest: z.boolean().optional(),
  archivedAt: z.string().nullable().optional()
});
export let groupSchema = z.object({
  id: resourceId,
  name: z.string(),
  description: z.string()
});
export let userPageSchema = z.object({
  users: z.array(userSchema),
  total: count,
  hasNextPage: z.boolean(),
  nextCursor: z.string().nullable()
});
export let groupPageSchema = z.object({
  groups: z.array(groupSchema),
  total: count,
  hasNextPage: z.boolean(),
  nextCursor: z.string().nullable()
});
export let sourceSchema = z.object({
  id: resourceId,
  title: z.string(),
  url: z.string(),
  updatedAt: z.string(),
  explanation: z.string().optional()
});
export let searchHitSchema = z.object({
  id: resourceId,
  title: z.string(),
  type: z.string(),
  updatedAt: z.string(),
  lastEditedAt: z.string(),
  archivedAt: z.string().nullable(),
  highlight: z.string(),
  reviewState: z.string().optional(),
  parentNotes: z.array(z.object({ id: resourceId, title: z.string() }))
});
export let searchPageSchema = z.object({
  hits: z.array(searchHitSchema),
  page: count,
  nbPages: count
});
export let indexPageSchema = z.object({
  hits: z.array(sourceSchema),
  page: count,
  nbPages: count
});
export let answerSchema = z.object({ answer: z.string(), sources: z.array(sourceSchema) });
export let processingSchema = z.object({
  answer: z.string(),
  sources: z.array(z.object({ id: resourceId, title: z.string(), url: z.string() })).length(0),
  status: z.literal('processing'),
  threadId: resourceId,
  retryAfterSeconds: z.number().nonnegative(),
  message: z.string()
});
export let threadSchema = z.object({
  threadId: resourceId,
  status: z.enum(['processing', 'completed', 'failed', 'needs-approval']),
  title: z.string().optional(),
  rounds: z.array(
    z.object({
      question: z.string(),
      answer: z.string(),
      sources: z.array(sourceSchema).optional()
    })
  ),
  retryAfterSeconds: z.number().nonnegative().optional(),
  message: z.string().optional(),
  triageUrl: z.string().optional(),
  pendingApprovalCount: count.optional()
});
export let parse = <T extends z.ZodType>(schema: T, value: unknown): z.output<T> => {
  let parsed = schema.safeParse(value);
  if (!parsed.success) throw malformed();
  return parsed.data;
};
export let noteSummary = (note: Note) => ({
  noteId: note.id,
  title: note.title,
  url: note.url,
  parentNoteId: note.parentNoteId,
  updatedAt: note.updatedAt,
  lastEditedAt: note.lastEditedAt,
  archivedAt: note.archivedAt,
  reviewState: note.reviewState,
  owner: note.owner
});

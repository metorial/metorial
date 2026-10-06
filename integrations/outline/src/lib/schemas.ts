import { z } from 'zod';
export const optionalText = z.string().nullish();
export const nativeUser = z.object({
  id: z.string().min(1),
  name: z.string(),
  email: optionalText,
  avatarUrl: optionalText,
  role: z.string(),
  isSuspended: z.boolean(),
  lastActiveAt: optionalText,
  createdAt: z.string(),
  updatedAt: z.string().optional()
});
const author = nativeUser.pick({ id: true, name: true });
export const nativeDocument = z.object({
  id: z.string().min(1),
  urlId: z.string().optional(),
  title: z.string(),
  text: z.string().optional(),
  icon: optionalText,
  emoji: optionalText,
  collectionId: optionalText,
  parentDocumentId: optionalText,
  template: z.boolean().optional(),
  templateId: optionalText,
  publishedAt: optionalText,
  createdAt: z.string(),
  updatedAt: z.string(),
  archivedAt: optionalText,
  deletedAt: optionalText,
  revision: z.number().int().nonnegative(),
  fullWidth: z.boolean(),
  createdBy: author,
  updatedBy: author,
  url: z.string().optional()
});
export const nativeCollection = z.object({
  id: z.string().min(1),
  name: z.string(),
  description: optionalText,
  color: optionalText,
  icon: optionalText,
  permission: optionalText,
  sharing: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: optionalText
});
export const nativeComment = z.object({
  id: z.string().min(1),
  documentId: z.string().min(1),
  data: z
    .object({ type: z.literal('doc'), content: z.array(z.unknown()).optional() })
    .passthrough(),
  parentCommentId: optionalText,
  createdAt: z.string(),
  updatedAt: z.string(),
  createdBy: author
});
export const nativeGroup = z.object({
  id: z.string().min(1),
  name: z.string(),
  memberCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string()
});
export const nativeMembership = z.object({
  id: z.string().min(1),
  collectionId: z.string().optional(),
  groupId: z.string().optional(),
  userId: z.string().optional(),
  permission: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});
export const paginationSchema = z.object({
  offset: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative().optional(),
  nextPath: z.string().nullish()
});
export const userOutput = z.object({
  userId: z.string(),
  name: z.string(),
  email: optionalText,
  avatarUrl: optionalText,
  role: z.string(),
  isSuspended: z.boolean(),
  isAdmin: z.boolean(),
  lastActiveAt: optionalText,
  createdAt: z.string()
});
export const authorOutput = z.object({ userId: z.string(), name: z.string() });
export const documentOutput = z.object({
  documentId: z.string(),
  title: z.string(),
  text: z.string().optional(),
  emoji: optionalText,
  icon: optionalText,
  collectionId: optionalText,
  parentDocumentId: optionalText,
  template: z.boolean().optional().describe('Legacy server template flag, when returned'),
  templateId: optionalText,
  publishedAt: optionalText,
  createdAt: z.string(),
  updatedAt: z.string(),
  archivedAt: optionalText,
  deletedAt: optionalText,
  revision: z.number(),
  fullWidth: z.boolean(),
  createdBy: authorOutput,
  updatedBy: authorOutput,
  url: z.string().optional()
});
export const collectionOutput = nativeCollection
  .omit({ id: true })
  .extend({ collectionId: z.string() });
export const commentOutput = nativeComment
  .omit({ id: true, data: true, createdBy: true })
  .extend({ commentId: z.string(), content: z.unknown(), createdBy: authorOutput });
export const groupOutput = nativeGroup.omit({ id: true }).extend({ groupId: z.string() });
export function mapDocument(d: z.infer<typeof nativeDocument>) {
  const { id, icon, emoji, createdBy, updatedBy, ...rest } = d;
  return {
    ...rest,
    documentId: id,
    icon,
    emoji: emoji ?? icon,
    createdBy: { userId: createdBy.id, name: createdBy.name },
    updatedBy: { userId: updatedBy.id, name: updatedBy.name }
  };
}
export function mapUser(u: z.infer<typeof nativeUser>) {
  const { id, ...rest } = u;
  return { ...rest, userId: id, isAdmin: u.role === 'admin' };
}
export function mapCollection(c: z.infer<typeof nativeCollection>) {
  const { id, ...rest } = c;
  return { ...rest, collectionId: id };
}
export function mapComment(c: z.infer<typeof nativeComment>) {
  const { id, data, createdBy, ...rest } = c;
  return {
    ...rest,
    commentId: id,
    content: data,
    createdBy: { userId: createdBy.id, name: createdBy.name }
  };
}
export function mapGroup(g: z.infer<typeof nativeGroup>) {
  const { id, ...rest } = g;
  return { ...rest, groupId: id };
}

import { z } from 'zod';
import { rawSchema } from '../shared/raw';

export let authorTypeSchema = z.enum(['user', 'app', 'system', 'webhook', 'unknown']);

export type AuthorType = z.infer<typeof authorTypeSchema>;

export let authorRoleSchema = z.enum(['member', 'guest', 'unknown']);

export type AuthorRole = z.infer<typeof authorRoleSchema>;

export let authorSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  fullName: z.string(),
  type: authorTypeSchema,
  role: authorRoleSchema.optional(),
  providerType: z.string().optional(),
  isMe: z.boolean(),
  email: z.string().optional(),
  imageUrl: z.string().optional(),
  raw: rawSchema
});

export type Author = z.infer<typeof authorSchema>;

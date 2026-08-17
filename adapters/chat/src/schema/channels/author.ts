import { z } from 'zod';

export let authorTypeSchema = z.enum(['user', 'app', 'system', 'webhook', 'unknown']);

export type AuthorType = z.infer<typeof authorTypeSchema>;

export let authorSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  fullName: z.string(),
  type: authorTypeSchema,
  isMe: z.boolean(),
  email: z.string().optional(),
  imageUrl: z.string().optional()
});

export type Author = z.infer<typeof authorSchema>;

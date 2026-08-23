import { z } from 'zod';

export let chatContextTypeSchema = z.enum([
  'issue',
  'pull_request',
  'review',
  'page',
  'ticket',
  'post',
  'unknown'
]);

export type ChatContextType = z.infer<typeof chatContextTypeSchema>;

export let chatContextActorSchema = z.object({
  id: z.string(),
  name: z.string()
});

export type ChatContextActor = z.infer<typeof chatContextActorSchema>;

export let chatContextSchema = z.object({
  type: chatContextTypeSchema,
  id: z.string(),
  description: z.string().optional(),
  status: z.string().optional(),
  url: z.string().optional(),
  author: chatContextActorSchema.optional(),
  assignee: chatContextActorSchema.optional(),
  labels: z.array(z.string()).optional()
});

export type ChatContext = z.infer<typeof chatContextSchema>;

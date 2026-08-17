import { z } from 'zod';

export let attachmentRefSchema = z.object({
  type: z.enum(['image', 'file', 'video', 'audio']),
  name: z.string().optional(),
  mimeType: z.string().optional(),
  url: z.string().optional(),
  size: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  encoding: z.enum(['base64', 'utf-8']).optional(),
  content: z.string().optional()
});

export type AttachmentRef = z.infer<typeof attachmentRefSchema>;

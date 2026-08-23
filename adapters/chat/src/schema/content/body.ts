import { z } from 'zod';
import { attachmentRefSchema } from './attachment';
import { chatPartSchema } from './part';

export let chatBodySchema = z.object({
  parts: z.array(chatPartSchema).min(1),
  altText: z
    .string()
    .optional()
    .describe('Plain-text alternative for notifications and clients that cannot render parts'),
  attachments: z.array(attachmentRefSchema).optional()
});

export type ChatBody = z.infer<typeof chatBodySchema>;

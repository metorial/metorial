import { z } from 'zod';

export const botIdSchema = z
  .string()
  .min(1)
  .describe('Bot ID. Call list_bots to discover available bots.');
export const folderIdSchema = z
  .string()
  .min(1)
  .describe('Folder ID. Call list_folders to discover available folders.');
export const conversationIdSchema = z
  .string()
  .min(1)
  .describe('Conversation ID from list_conversations or create_conversation.');
export const documentIdSchema = z
  .string()
  .min(1)
  .describe('Document ID from list_documents or a document creation tool.');
export const pageSchema = z
  .number()
  .int()
  .positive()
  .optional()
  .describe('Page number, starting at 1.');
export const paginationSchema = z.object({
  count: z.number(),
  total: z.number(),
  perPage: z.number(),
  totalPages: z.number(),
  nextPage: z.number().nullable(),
  previousPage: z.number().nullable()
});
export const botSchema = z.object({
  botId: z.string(),
  name: z.string(),
  model: z.string().optional().describe('LLM model, when returned by Cody.'),
  createdAt: z.number().describe('Unix creation timestamp in seconds.')
});
export const folderSchema = z.object({
  folderId: z.string(),
  name: z.string(),
  createdAt: z.number().describe('Unix creation timestamp in seconds.')
});
export const documentSchema = z.object({
  documentId: z.string(),
  name: z.string(),
  status: z.string().describe('Learning status: syncing, synced, or sync_failed.'),
  contentUrl: z.string().describe('Provider URL for downloading the document as HTML.'),
  folderId: z.string(),
  createdAt: z.number().describe('Unix creation timestamp in seconds.')
});
export const conversationSchema = z.object({
  conversationId: z.string(),
  name: z.string(),
  botId: z.string(),
  documentIds: z
    .array(z.string())
    .optional()
    .describe('Focus mode document IDs, when requested.'),
  createdAt: z.number().describe('Unix creation timestamp in seconds.')
});
export const messageSourceSchema = z.object({
  type: z.string(),
  documentId: z.string(),
  documentName: z.string(),
  documentUrl: z.string(),
  fileName: z.string().optional(),
  webpageUrl: z.string().optional(),
  createdAt: z.number()
});
export const messageSchema = z.object({
  messageId: z.string(),
  content: z.string(),
  conversationId: z.string(),
  machine: z.boolean().describe('Whether the message is AI-generated.'),
  failedResponding: z.boolean().describe('Whether response generation failed.'),
  flagged: z
    .boolean()
    .describe('Whether the provider flagged the message for a policy violation.'),
  createdAt: z.number().describe('Unix creation timestamp in seconds.'),
  sources: z
    .array(messageSourceSchema)
    .optional()
    .describe('Knowledge sources used for the response.'),
  usage: z.object({ tokens: z.number().optional(), credits: z.number().optional() }).optional()
});

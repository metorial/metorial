import { z } from 'zod';

export let graphIdSchema = z
  .string()
  .describe('Knowledge Graph ID. Call list_knowledge_graphs to discover IDs.');
export let fileIdSchema = z
  .string()
  .describe('File ID. Call list_files to discover uploaded files.');
export let applicationIdSchema = z
  .string()
  .describe(
    'Deployed agent ID. Call list_agents to discover IDs and get_agent_details for required inputs.'
  );

export let graphFileStatus = z
  .object({
    in_progress: z.number().describe('Files still being processed.'),
    completed: z.number().describe('Files ready for queries.'),
    failed: z.number().describe('Files that failed to process.'),
    total: z.number().describe('Total files associated with the graph.')
  })
  .optional()
  .describe('Knowledge Graph ingestion status, when returned.');

export let paginationInput = {
  before: z
    .string()
    .optional()
    .describe('First ID from the previous page. Use either before or after.'),
  after: z
    .string()
    .optional()
    .describe('Last ID from the previous page to request the next page.'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum results per page (1-100; default 50).'),
  order: z.enum(['asc', 'desc']).optional().describe('Order by creation time (default desc).')
};

export let paginationOutput = {
  hasMore: z.boolean().describe('Whether another page is available.'),
  firstId: z.string().optional().describe('Use as before to request the previous page.'),
  lastId: z.string().optional().describe('Use as after to request the next page.')
};

export let fileOutput = z.object({
  fileId: z.string().describe('Unique file ID'),
  name: z.string().describe('File name'),
  createdAt: z.string().describe('Upload timestamp'),
  graphIds: z.array(z.string()).describe('Associated Knowledge Graph IDs'),
  status: z.string().describe('Processing status')
});

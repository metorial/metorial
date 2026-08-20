import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    workspaceId: {
      schema: z.string().optional().describe('Default workspace ID for admin operations'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    botId: {
      schema: z
        .string()
        .optional()
        .describe('Default bot ID for runtime, tables, and files operations'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});

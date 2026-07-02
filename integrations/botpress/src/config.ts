import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    workspaceId: z.string().optional().describe('Default workspace ID for admin operations'),
    botId: z
      .string()
      .optional()
      .describe('Default bot ID for runtime, tables, and files operations')
  })
);

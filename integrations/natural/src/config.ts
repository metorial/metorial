import { SlateConfig } from 'slates';
import { z } from 'zod';

export const config = SlateConfig.create(
  z.object({
    agentId: z
      .string()
      .optional()
      .describe('Optional default Natural agent ID to send as X-Agent-ID for party API keys.'),
    instanceId: z
      .string()
      .optional()
      .describe('Optional default Natural instance ID to send as X-Instance-ID.')
  })
);

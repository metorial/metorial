import { configV2 } from 'slates';
import { z } from 'zod';

export const config = configV2({
  fields: {
    agentId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Optional default Natural agent ID to send as X-Agent-ID for party API keys.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    instanceId: {
      schema: z
        .string()
        .trim()
        .min(1)
        .max(1024)
        .optional()
        .describe(
          'Optional default Natural instance ID to send as X-Instance-ID (1-1024 characters).'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});

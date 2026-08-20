import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    deploymentUrl: {
      schema: z
        .string()
        .describe('The Convex deployment URL (e.g. https://happy-animal-123.convex.cloud)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});

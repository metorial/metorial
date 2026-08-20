import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    projectId: {
      schema: z
        .string()
        .describe('The SatisMeter Project ID. Found in Settings > Integrations > API.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});

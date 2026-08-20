import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    organizationId: {
      schema: z
        .string()
        .describe('The Zoho Books organization ID. Required for all API requests.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});

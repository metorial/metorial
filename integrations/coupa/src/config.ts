import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    instanceUrl: {
      schema: z
        .string()
        .describe(
          'Your Coupa instance URL, e.g. https://mycompany.coupahost.com or https://mycompany.coupacloud.com'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});

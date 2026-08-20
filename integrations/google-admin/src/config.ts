import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    domain: {
      schema: z
        .string()
        .optional()
        .describe(
          'Primary Google Workspace domain (e.g. example.com). Used to scope API calls to a specific domain.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    customerId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Google Workspace customer ID (e.g. C03az79cb). If not provided, "my_customer" is used to refer to the authenticated user\'s customer.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});

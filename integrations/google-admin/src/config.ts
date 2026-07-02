import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    domain: z
      .string()
      .optional()
      .describe(
        'Primary Google Workspace domain (e.g. example.com). Used to scope API calls to a specific domain.'
      ),
    customerId: z
      .string()
      .optional()
      .describe(
        'Google Workspace customer ID (e.g. C03az79cb). If not provided, "my_customer" is used to refer to the authenticated user\'s customer.'
      )
  })
);

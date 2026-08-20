import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    tenantId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Azure AD tenant ID. Defaults to "common" for multi-tenant apps. Use a specific tenant ID to restrict access to a single organization.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});

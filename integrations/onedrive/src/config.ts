import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    tenantId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Azure AD tenant ID. Defaults to "common" which allows any Microsoft account or Azure AD account to sign in. Set to a specific tenant ID to restrict access to a single organization.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});

import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    tenantId: {
      schema: z
        .string()
        .describe(
          'Azure AD (Microsoft Entra ID) Tenant ID. Found in Azure portal under App registrations.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});

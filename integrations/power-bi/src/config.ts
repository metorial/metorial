import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    tenantId: z
      .string()
      .describe(
        'Azure AD (Microsoft Entra ID) Tenant ID. Found in Azure portal under App registrations.'
      )
  })
);

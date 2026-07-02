import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    domain: z
      .string()
      .describe(
        'Your Auth0 tenant domain (e.g., your-tenant.auth0.com or your-tenant.us.auth0.com)'
      )
  })
);

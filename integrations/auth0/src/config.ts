import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    domain: {
      schema: z
        .string()
        .describe(
          'Your Auth0 tenant domain (e.g., your-tenant.auth0.com or your-tenant.us.auth0.com)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});

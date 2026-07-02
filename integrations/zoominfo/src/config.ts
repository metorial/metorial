import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    apiVersion: z
      .enum(['new', 'legacy'])
      .default('legacy')
      .describe(
        'API version to use. "new" uses the /gtm path prefix with OAuth2 PKCE. "legacy" uses the classic Enterprise API with JWT authentication.'
      )
  })
);

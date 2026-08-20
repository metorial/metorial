import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    apiVersion: {
      schema: z
        .enum(['new', 'legacy'])
        .default('legacy')
        .describe(
          'API version to use. "new" uses the /gtm path prefix with OAuth2 PKCE. "legacy" uses the classic Enterprise API with JWT authentication.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});

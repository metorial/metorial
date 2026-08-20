import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    siteUrl: {
      schema: z
        .string()
        .describe(
          'The WordPress site URL (e.g. "https://mysite.wordpress.com" for WordPress.com or "https://example.com" for self-hosted). Used as the base for API requests.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    apiType: {
      schema: z
        .enum(['wpcom', 'selfhosted'])
        .default('wpcom')
        .describe(
          'Whether this is a WordPress.com site ("wpcom") or a self-hosted WordPress.org site ("selfhosted").'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});

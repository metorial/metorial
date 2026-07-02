import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    siteUrl: z
      .string()
      .describe(
        'The WordPress site URL (e.g. "https://mysite.wordpress.com" for WordPress.com or "https://example.com" for self-hosted). Used as the base for API requests.'
      ),
    apiType: z
      .enum(['wpcom', 'selfhosted'])
      .default('wpcom')
      .describe(
        'Whether this is a WordPress.com site ("wpcom") or a self-hosted WordPress.org site ("selfhosted").'
      )
  })
);

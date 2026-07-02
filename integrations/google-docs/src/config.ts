import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // Google Docs API typically doesn't require global configuration
    // All authentication is handled via OAuth2
    // Configuration is kept empty as no tenant-specific or environment-specific settings are needed
  })
);

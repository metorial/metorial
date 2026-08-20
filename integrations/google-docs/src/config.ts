import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // Google Docs API typically doesn't require global configuration
    // All authentication is handled via OAuth2
    // Configuration is kept empty as no tenant-specific or environment-specific settings are needed
  }
});

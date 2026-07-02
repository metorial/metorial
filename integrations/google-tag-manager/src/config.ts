import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // Google Tag Manager API does not require global configuration
    // All authentication is handled via OAuth2
  })
);

import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed - Spoki uses a single base URL
    // and authentication is handled via API key in the auth module
  })
);

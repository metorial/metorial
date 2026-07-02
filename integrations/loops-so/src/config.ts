import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // Loops uses a single API key for authentication and the base URL is fixed.
    // No global configuration is needed.
  })
);

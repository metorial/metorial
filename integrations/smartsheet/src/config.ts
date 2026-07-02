import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // Smartsheet uses a single API base URL and does not require tenant-specific configuration.
    // All necessary credentials are handled via authentication.
  })
);

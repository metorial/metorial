import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for CustomJS
    // All configuration is done per-tool via input schemas
    // The API key is handled via authentication
  })
);

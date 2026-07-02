import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // Telnyx API does not require global configuration beyond authentication
    // All configuration is handled through the API itself
  })
);

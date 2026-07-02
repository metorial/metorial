import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed - ClassMarker uses API key + secret authentication
    // which is handled in auth.ts. The API base URL is fixed.
  })
);

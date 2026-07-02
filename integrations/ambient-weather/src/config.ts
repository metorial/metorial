import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for Ambient Weather
    // Authentication keys (applicationKey and apiKey) are handled in auth.ts
  })
);

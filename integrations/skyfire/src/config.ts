import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for Skyfire
    // Authentication is handled via API key in auth.ts
    // The base URL is fixed at https://api.skyfire.xyz
  })
);

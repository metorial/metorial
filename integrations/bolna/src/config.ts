import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for Bolna
    // Authentication is handled via Bearer token in auth.ts
    // The base URL is fixed at https://api.bolna.ai
  })
);

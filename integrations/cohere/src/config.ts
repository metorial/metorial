import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for Cohere
    // Authentication is handled via Bearer token in auth.ts
    // Base URL is fixed at https://api.cohere.com
  })
);

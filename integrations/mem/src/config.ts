import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for Mem
    // The base URL is fixed at https://api.mem.ai/v2
    // Authentication is handled via API key in auth.ts
  })
);

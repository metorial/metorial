import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // Amara does not require any global configuration
    // Authentication is handled via API key in auth.ts
  })
);

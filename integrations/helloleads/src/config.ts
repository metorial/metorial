import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for HelloLeads
    // Authentication details (API key, email) are handled in auth.ts
  })
);

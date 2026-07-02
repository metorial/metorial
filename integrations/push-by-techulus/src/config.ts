import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for Push by Techulus
    // Authentication is handled via API keys in auth.ts
  })
);

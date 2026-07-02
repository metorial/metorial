import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for AnonyFlow
    // Authentication is handled via API key in auth.ts
    // Base URL is fixed: https://api.anonyflow.com
  })
);

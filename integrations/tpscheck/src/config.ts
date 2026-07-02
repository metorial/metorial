import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for TPSCheck
    // Authentication is handled via API key in auth.ts
    // The base URL is fixed: https://api.tpscheck.uk/
  })
);

import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for Capsule CRM
    // All API requests use the same base URL: https://api.capsulecrm.com/api/v2
    // Authentication is handled via Bearer tokens in auth.ts
  })
);

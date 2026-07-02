import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // Wave API does not require global configuration beyond authentication
    // All operations are scoped to a business via businessId in individual tool inputs
  })
);

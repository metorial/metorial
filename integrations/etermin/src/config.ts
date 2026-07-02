import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global config needed - eTermin API base URL is fixed
    // Authentication credentials are handled in auth.ts
  })
);

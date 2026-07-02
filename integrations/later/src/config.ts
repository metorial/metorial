import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for Later Influence API
    // The base URL is always https://api.mavrck.co
    // Authentication credentials are handled via auth.ts
  })
);

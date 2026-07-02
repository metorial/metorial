import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for FaceUp
    // Authentication (API key + region) is handled in auth.ts
  })
);

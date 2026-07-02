import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for Yelp Places API
    // Authentication is handled via API key in auth.ts
  })
);

import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for Render
    // Authentication is handled via API key in auth.ts
    // The API base URL is fixed at https://api.render.com/v1
  })
);

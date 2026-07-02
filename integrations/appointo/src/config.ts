import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for Appointo
    // Authentication is handled via API key in auth.ts
    // Base URL is fixed: https://app.appointo.me/api/
  })
);

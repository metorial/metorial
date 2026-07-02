import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for Listclean
    // The API base URL is fixed and authentication is handled via auth.ts
  })
);

import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for Leverly.
    // Authentication credentials (username, API key, account ID) are handled in auth.ts.
  })
);

import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for Cursor.
    // Authentication is handled via API keys in auth.ts.
    // The base URL is fixed at https://api.cursor.com.
  })
);

import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for Nasdaq Data Link.
    // Authentication tokens and API URLs are handled in auth.ts.
  })
);

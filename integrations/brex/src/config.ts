import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // Brex has a single production API; no global configuration is needed.
    // Authentication details (tokens, OAuth) are handled in auth.ts.
  })
);

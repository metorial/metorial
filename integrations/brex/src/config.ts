import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // Brex has a single production API; no global configuration is needed.
    // Authentication details (tokens, OAuth) are handled in auth.ts.
  }
});

import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed for Nasdaq Data Link.
    // Authentication tokens and API URLs are handled in auth.ts.
  }
});

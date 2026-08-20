import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed for Leverly.
    // Authentication credentials (username, API key, account ID) are handled in auth.ts.
  }
});

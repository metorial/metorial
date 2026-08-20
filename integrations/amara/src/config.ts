import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // Amara does not require any global configuration
    // Authentication is handled via API key in auth.ts
  }
});

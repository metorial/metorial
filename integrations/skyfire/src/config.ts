import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed for Skyfire
    // Authentication is handled via API key in auth.ts
    // The base URL is fixed at https://api.skyfire.xyz
  }
});

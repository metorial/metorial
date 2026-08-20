import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed for Later Influence API
    // The base URL is always https://api.mavrck.co
    // Authentication credentials are handled via auth.ts
  }
});

import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed for Ambient Weather
    // Authentication keys (applicationKey and apiKey) are handled in auth.ts
  }
});

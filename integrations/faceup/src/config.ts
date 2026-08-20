import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed for FaceUp
    // Authentication (API key + region) is handled in auth.ts
  }
});

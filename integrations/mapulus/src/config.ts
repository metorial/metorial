import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed for Mapulus
    // Authentication is handled via Bearer token in auth.ts
  }
});

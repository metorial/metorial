import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed - ClassMarker uses API key + secret authentication
    // which is handled in auth.ts. The API base URL is fixed.
  }
});

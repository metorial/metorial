import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed for CustomJS
    // All configuration is done per-tool via input schemas
    // The API key is handled via authentication
  }
});

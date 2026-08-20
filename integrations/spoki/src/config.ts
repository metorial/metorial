import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed - Spoki uses a single base URL
    // and authentication is handled via API key in the auth module
  }
});

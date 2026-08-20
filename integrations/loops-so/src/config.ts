import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // Loops uses a single API key for authentication and the base URL is fixed.
    // No global configuration is needed.
  }
});

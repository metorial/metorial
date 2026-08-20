import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed for Scale AI
    // The API key is handled via authentication
    // The base URL is always https://api.scale.com/v1
  }
});

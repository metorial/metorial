import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed for Faraday
    // The API base URL is fixed and auth is handled via bearer token
  }
});

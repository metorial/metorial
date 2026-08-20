import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // Shippo doesn't require global configuration beyond authentication
    // The base URL is fixed at https://api.goshippo.com/
  }
});

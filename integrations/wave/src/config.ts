import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // Wave API does not require global configuration beyond authentication
    // All operations are scoped to a business via businessId in individual tool inputs
  }
});

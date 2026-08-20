import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed for Capsule CRM
    // All API requests use the same base URL: https://api.capsulecrm.com/api/v2
    // Authentication is handled via Bearer tokens in auth.ts
  }
});

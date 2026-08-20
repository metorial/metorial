import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed for Listclean
    // The API base URL is fixed and authentication is handled via auth.ts
  }
});

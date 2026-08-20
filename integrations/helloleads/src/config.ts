import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed for HelloLeads
    // Authentication details (API key, email) are handled in auth.ts
  }
});

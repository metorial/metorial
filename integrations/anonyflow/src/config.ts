import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed for AnonyFlow
    // Authentication is handled via API key in auth.ts
    // Base URL is fixed: https://api.anonyflow.com
  }
});

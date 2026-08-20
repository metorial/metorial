import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global config needed - eTermin API base URL is fixed
    // Authentication credentials are handled in auth.ts
  }
});

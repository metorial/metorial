import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // Benchmark Email API does not require any public configuration
    // All sensitive values (API token) are handled via authentication
  }
});

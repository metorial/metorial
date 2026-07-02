import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // Benchmark Email API does not require any public configuration
    // All sensitive values (API token) are handled via authentication
  })
);

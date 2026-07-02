import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for Faraday
    // The API base URL is fixed and auth is handled via bearer token
  })
);

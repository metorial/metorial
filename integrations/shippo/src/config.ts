import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // Shippo doesn't require global configuration beyond authentication
    // The base URL is fixed at https://api.goshippo.com/
  })
);

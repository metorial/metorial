import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // Vonage uses two base domains: rest.nexmo.com for legacy APIs and api.nexmo.com for newer APIs
    // No user-configurable global config is needed since region/environment is determined by auth
  })
);

import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for Shorten.REST
    // The API key is handled via authentication
    // The domain can vary per alias, so it's passed per-tool as needed
  })
);

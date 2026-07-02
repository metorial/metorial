import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // Geoapify requires no global configuration beyond the API key (handled in auth).
  })
);

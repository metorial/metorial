import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  // Preserve stored connection configuration while new connections resolve IDs from an API URL.
  z.object({}).passthrough()
);

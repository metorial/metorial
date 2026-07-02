import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // Affinity uses a single base URL and API key auth - no global configuration needed
  })
);

import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // Eventee API tokens are scoped to a specific event.
    // No additional global configuration is needed since auth token determines the event context.
  })
);

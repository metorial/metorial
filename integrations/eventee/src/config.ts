import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // Eventee API tokens are scoped to a specific event.
    // No additional global configuration is needed since auth token determines the event context.
  }
});

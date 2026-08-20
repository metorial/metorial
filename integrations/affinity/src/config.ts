import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // Affinity uses a single base URL and API key auth - no global configuration needed
  }
});

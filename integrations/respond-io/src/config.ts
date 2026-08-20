import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global config needed - Respond.io uses a single workspace-level API
    // The base URL is fixed at https://api.respond.io/v2
  }
});

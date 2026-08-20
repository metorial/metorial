import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global config needed - authentication tokens handle API access
    // Project-specific IDs are passed per-tool as needed
  }
});

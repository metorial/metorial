import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // Smartsheet uses a single API base URL and does not require tenant-specific configuration.
    // All necessary credentials are handled via authentication.
  }
});

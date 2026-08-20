import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // Chatwork uses a single global API base URL and no tenant-specific configuration
  }
});

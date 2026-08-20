import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // SalesLoft API has a single base URL and no tenant-specific configuration needed
    // All configuration is handled through authentication
  }
});

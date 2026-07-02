import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // SalesLoft API has a single base URL and no tenant-specific configuration needed
    // All configuration is handled through authentication
  })
);

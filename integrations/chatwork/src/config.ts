import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // Chatwork uses a single global API base URL and no tenant-specific configuration
  })
);

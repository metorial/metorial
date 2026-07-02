import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for Google Sheets
    // All necessary values are handled through authentication
  })
);

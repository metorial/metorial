import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for AltText.ai
    // All settings (language, keywords, etc.) are per-request parameters
  })
);

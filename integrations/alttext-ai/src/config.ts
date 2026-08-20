import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed for AltText.ai
    // All settings (language, keywords, etc.) are per-request parameters
  }
});

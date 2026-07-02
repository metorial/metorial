import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global config needed - service key and webhooks key are auth concerns
  })
);

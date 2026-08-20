import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global config needed - service key and webhooks key are auth concerns
  }
});

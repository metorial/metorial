import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed for Spondyr
    // API Key and Application Token are handled via authentication
  }
});

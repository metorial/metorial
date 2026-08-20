import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // Telnyx API does not require global configuration beyond authentication
    // All configuration is handled through the API itself
  }
});

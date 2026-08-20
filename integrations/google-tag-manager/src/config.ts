import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // Google Tag Manager API does not require global configuration
    // All authentication is handled via OAuth2
  }
});

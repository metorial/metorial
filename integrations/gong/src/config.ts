import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // Gong OAuth returns a customer-specific base URL (api_base_url_for_customer)
    // which is stored in auth output. For Basic Auth, the default base URL is https://api.gong.io
    // No global configuration needed.
  }
});

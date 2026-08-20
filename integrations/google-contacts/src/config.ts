import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed for Google Contacts
    // Authentication is handled through OAuth 2.0 or API keys
  }
});

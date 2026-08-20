import { configV2 } from 'slates';

export let config = configV2({
  fields: {
    // No global configuration needed for Cursor.
    // Authentication is handled via API keys in auth.ts.
    // The base URL is fixed at https://api.cursor.com.
  }
});

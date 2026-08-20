import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // DataScope does not require global configuration beyond authentication.
    // The API base URL is fixed at https://www.mydatascope.com/api/external
  }
});

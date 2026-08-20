import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // ClickSend does not require global configuration beyond authentication.
    // All API access is determined by the authenticated user's account.
  }
});

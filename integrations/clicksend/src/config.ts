import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // ClickSend does not require global configuration beyond authentication.
    // All API access is determined by the authenticated user's account.
  })
);

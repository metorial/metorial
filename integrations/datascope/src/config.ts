import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // DataScope does not require global configuration beyond authentication.
    // The API base URL is fixed at https://www.mydatascope.com/api/external
  })
);

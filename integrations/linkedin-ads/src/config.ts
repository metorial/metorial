import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // LinkedIn Ads does not require global configuration beyond authentication
    // All account-specific identifiers are passed as tool inputs
  })
);

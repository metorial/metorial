import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // LinkedIn Ads does not require global configuration beyond authentication
    // All account-specific identifiers are passed as tool inputs
  }
});

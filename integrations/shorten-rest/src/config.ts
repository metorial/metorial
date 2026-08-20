import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed for Shorten.REST
    // The API key is handled via authentication
    // The domain can vary per alias, so it's passed per-tool as needed
  }
});

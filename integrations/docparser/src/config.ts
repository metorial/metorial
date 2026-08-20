import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed for Docparser
    // All configuration is handled through authentication (API key)
  }
});

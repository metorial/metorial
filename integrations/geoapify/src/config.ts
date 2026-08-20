import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // Geoapify requires no global configuration beyond the API key (handled in auth).
  }
});

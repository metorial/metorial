import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed for Vestaboard.
    // API type and credentials are handled through authentication.
  }
});

import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // Fivetran API uses a fixed base URL; no global configuration needed.
  }
});

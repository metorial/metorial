import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed for Cults3D
    // The API has a single endpoint and no environment-specific settings
  }
});

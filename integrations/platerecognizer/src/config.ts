import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed for Plate Recognizer
    // All configuration is done per-request via tool inputs
  }
});

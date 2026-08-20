import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed - chatbot IDs are passed per-tool as input parameters
    // API token is handled via auth
  }
});

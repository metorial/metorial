import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global config needed - authentication handles all credentials
    // Studio ID is part of the New Lead API auth, API key is part of the Public API auth
  }
});

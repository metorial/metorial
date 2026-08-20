import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    // No global configuration needed for OKSign
    // All sensitive values (account number, tokens) are part of authentication
  }
});

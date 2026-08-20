import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    instanceUrl: {
      schema: z
        .string()
        .describe(
          'Base URL of your BTCPay Server instance (e.g., https://btcpay.example.com)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});

import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    instanceUrl: z
      .string()
      .describe('Base URL of your BTCPay Server instance (e.g., https://btcpay.example.com)')
  })
);

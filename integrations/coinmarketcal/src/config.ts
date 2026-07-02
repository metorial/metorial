import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    // No global configuration needed for CoinMarketCal
    // Authentication (API key) is handled in auth.ts
  })
);

import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlisioClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrencies = SlateTool.create(spec, {
  name: 'Get Currencies',
  key: 'get_currencies',
  description: `Retrieve the list of supported cryptocurrencies with their exchange rates, minimum amounts, and commission details. Rates are returned against a specified fiat currency (defaults to USD).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      fiatCurrency: z
        .string()
        .optional()
        .describe(
          'Fiat currency code for rate conversion (e.g. USD, EUR, GBP). Defaults to USD.'
        )
    })
  )
  .output(
    z.object({
      currencies: z
        .array(
          z.object({
            name: z.string().describe('Cryptocurrency name'),
            cryptoId: z.string().describe('Cryptocurrency identifier'),
            currency: z.string().describe('Currency code'),
            icon: z.string().optional().describe('Icon URL'),
            rateUsd: z.string().optional().describe('Exchange rate in USD'),
            priceUsd: z.string().optional().describe('Price in USD'),
            precision: z.number().optional().describe('Decimal precision'),
            fiat: z.string().optional().describe('Fiat currency used for rate'),
            fiatRate: z.string().optional().describe('Exchange rate in requested fiat'),
            minSumIn: z.string().optional().describe('Minimum invoice amount'),
            invoiceCommissionPercentage: z
              .string()
              .optional()
              .describe('Invoice commission percentage'),
            hidden: z.boolean().optional().describe('Whether the currency is hidden'),
            maintenance: z
              .boolean()
              .optional()
              .describe('Whether the currency is under maintenance')
          })
        )
        .describe('List of supported cryptocurrencies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlisioClient({ token: ctx.auth.token });

    let result = await client.getCurrencies(ctx.input.fiatCurrency);

    let currencies = (Array.isArray(result) ? result : []).map((c: any) => ({
      name: c.name,
      cryptoId: c.cid,
      currency: c.currency,
      icon: c.icon,
      rateUsd: c.rate_usd,
      priceUsd: c.price_usd,
      precision: c.precision,
      fiat: c.fiat,
      fiatRate: c.fiat_rate,
      minSumIn: c.min_sum_in,
      invoiceCommissionPercentage: c.invoice_commission_percentage,
      hidden: c.hidden,
      maintenance: c.maintenance
    }));

    return {
      output: { currencies },
      message: `Found **${currencies.length}** supported cryptocurrencies${ctx.input.fiatCurrency ? ` with rates in ${ctx.input.fiatCurrency}` : ''}.`
    };
  })
  .build();

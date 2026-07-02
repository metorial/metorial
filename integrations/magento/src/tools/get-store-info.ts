import { SlateTool } from 'slates';
import { z } from 'zod';
import { MagentoClient } from '../lib/client';
import { spec } from '../spec';

export let getStoreInfo = SlateTool.create(spec, {
  name: 'Get Store Info',
  key: 'get_store_info',
  description: `Retrieve store configuration, websites, store groups, currencies, and available countries. Useful for understanding the store setup and retrieving reference data needed for other operations.`,
  instructions: [
    'Set **infoType** to select what information to retrieve.',
    '"config" returns store settings like locale, currency, timezone, and URLs.',
    '"websites" and "store_groups" show the multi-site structure.',
    '"currencies" returns available and exchange rates.',
    '"countries" returns available countries with region data.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      infoType: z
        .enum(['config', 'websites', 'store_groups', 'currencies', 'countries'])
        .describe('Type of store information to retrieve')
    })
  )
  .output(
    z.object({
      storeConfigs: z
        .array(
          z.object({
            storeId: z.number().optional().describe('Store ID'),
            code: z.string().optional().describe('Store code'),
            websiteId: z.number().optional().describe('Website ID'),
            locale: z.string().optional().describe('Locale (e.g. en_US)'),
            baseCurrencyCode: z.string().optional().describe('Base currency code'),
            defaultCurrencyCode: z.string().optional().describe('Default display currency'),
            timezone: z.string().optional().describe('Store timezone'),
            weightUnit: z.string().optional().describe('Weight unit (lbs, kgs)'),
            baseUrl: z.string().optional().describe('Base URL'),
            secureBaseUrl: z.string().optional().describe('Secure base URL')
          })
        )
        .optional()
        .describe('Store configuration data'),
      websites: z.array(z.any()).optional().describe('Website list'),
      storeGroups: z.array(z.any()).optional().describe('Store group list'),
      currencies: z.any().optional().describe('Currency information'),
      countries: z.array(z.any()).optional().describe('Available countries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MagentoClient({
      storeUrl: ctx.config.storeUrl,
      storeCode: ctx.config.storeCode,
      token: ctx.auth.token
    });

    if (ctx.input.infoType === 'config') {
      let configs = await client.getStoreConfigs();
      return {
        output: {
          storeConfigs: configs.map(c => ({
            storeId: c.id,
            code: c.code,
            websiteId: c.website_id,
            locale: c.locale,
            baseCurrencyCode: c.base_currency_code,
            defaultCurrencyCode: c.default_display_currency_code,
            timezone: c.timezone,
            weightUnit: c.weight_unit,
            baseUrl: c.base_url,
            secureBaseUrl: c.secure_base_url
          }))
        },
        message: `Retrieved configuration for **${configs.length}** store(s).`
      };
    }

    if (ctx.input.infoType === 'websites') {
      let websites = await client.getWebsites();
      return {
        output: { websites },
        message: `Retrieved **${websites.length}** website(s).`
      };
    }

    if (ctx.input.infoType === 'store_groups') {
      let groups = await client.getStoreGroups();
      return {
        output: { storeGroups: groups },
        message: `Retrieved **${groups.length}** store group(s).`
      };
    }

    if (ctx.input.infoType === 'currencies') {
      let currencies = await client.getCurrencies();
      return {
        output: { currencies },
        message: `Retrieved currency information.`
      };
    }

    // countries
    let countries = await client.getCountries();
    return {
      output: { countries },
      message: `Retrieved **${countries.length}** countries.`
    };
  })
  .build();

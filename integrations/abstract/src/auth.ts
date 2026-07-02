import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      emailValidationToken: z.string().optional(),
      phoneValidationToken: z.string().optional(),
      ipGeolocationToken: z.string().optional(),
      companyEnrichmentToken: z.string().optional(),
      exchangeRatesToken: z.string().optional(),
      holidaysToken: z.string().optional(),
      timezoneToken: z.string().optional(),
      webScrapingToken: z.string().optional(),
      screenshotToken: z.string().optional(),
      imageProcessingToken: z.string().optional(),
      avatarsToken: z.string().optional(),
      vatToken: z.string().optional(),
      ibanToken: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Keys',
    key: 'api_keys',

    inputSchema: z.object({
      emailValidationToken: z.string().optional().describe('API key for Email Validation API'),
      phoneValidationToken: z.string().optional().describe('API key for Phone Validation API'),
      ipGeolocationToken: z.string().optional().describe('API key for IP Geolocation API'),
      companyEnrichmentToken: z
        .string()
        .optional()
        .describe('API key for Company Enrichment API'),
      exchangeRatesToken: z.string().optional().describe('API key for Exchange Rates API'),
      holidaysToken: z.string().optional().describe('API key for Public Holidays API'),
      timezoneToken: z.string().optional().describe('API key for Timezone API'),
      webScrapingToken: z.string().optional().describe('API key for Web Scraping API'),
      screenshotToken: z.string().optional().describe('API key for Website Screenshot API'),
      imageProcessingToken: z.string().optional().describe('API key for Image Processing API'),
      avatarsToken: z.string().optional().describe('API key for User Avatars API'),
      vatToken: z.string().optional().describe('API key for VAT Validation API'),
      ibanToken: z.string().optional().describe('API key for IBAN Validation API')
    }),

    getOutput: async ctx => {
      return {
        output: {
          emailValidationToken: ctx.input.emailValidationToken,
          phoneValidationToken: ctx.input.phoneValidationToken,
          ipGeolocationToken: ctx.input.ipGeolocationToken,
          companyEnrichmentToken: ctx.input.companyEnrichmentToken,
          exchangeRatesToken: ctx.input.exchangeRatesToken,
          holidaysToken: ctx.input.holidaysToken,
          timezoneToken: ctx.input.timezoneToken,
          webScrapingToken: ctx.input.webScrapingToken,
          screenshotToken: ctx.input.screenshotToken,
          imageProcessingToken: ctx.input.imageProcessingToken,
          avatarsToken: ctx.input.avatarsToken,
          vatToken: ctx.input.vatToken,
          ibanToken: ctx.input.ibanToken
        }
      };
    }
  });

import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

export let getSettings = SlateTool.create(spec, {
  name: 'Get Settings',
  key: 'get_settings',
  description: `Retrieves key organisation settings from Xero including tax rates, tracking categories, currencies, and branding themes. Returns all settings in a single call for convenience.`,
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      include: z
        .array(z.enum(['taxRates', 'trackingCategories', 'currencies', 'brandingThemes']))
        .optional()
        .describe('Which settings to include. Defaults to all.')
    })
  )
  .output(
    z.object({
      taxRates: z
        .array(
          z.object({
            name: z.string().optional().describe('Tax rate name'),
            taxType: z.string().optional().describe('Tax type code'),
            effectiveRate: z.number().optional().describe('Effective tax rate percentage'),
            status: z.string().optional().describe('Active or archived'),
            canApplyToRevenue: z.boolean().optional(),
            canApplyToExpenses: z.boolean().optional()
          })
        )
        .optional()
        .describe('Available tax rates'),
      trackingCategories: z
        .array(
          z.object({
            trackingCategoryId: z.string().optional().describe('Tracking category ID'),
            name: z.string().optional().describe('Tracking category name'),
            status: z.string().optional().describe('Status'),
            options: z
              .array(
                z.object({
                  trackingOptionId: z.string().optional(),
                  name: z.string().optional(),
                  status: z.string().optional()
                })
              )
              .optional()
              .describe('Available options within this category')
          })
        )
        .optional()
        .describe('Tracking categories and their options'),
      currencies: z
        .array(
          z.object({
            code: z.string().optional().describe('Currency code'),
            description: z.string().optional().describe('Currency description')
          })
        )
        .optional()
        .describe('Configured currencies'),
      brandingThemes: z
        .array(
          z.object({
            brandingThemeId: z.string().optional().describe('Branding theme ID'),
            name: z.string().optional().describe('Theme name'),
            sortOrder: z.number().optional().describe('Sort order')
          })
        )
        .optional()
        .describe('Available branding themes')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClientFromContext(ctx);
    let include = ctx.input.include || [
      'taxRates',
      'trackingCategories',
      'currencies',
      'brandingThemes'
    ];

    let output: Record<string, any> = {};

    if (include.includes('taxRates')) {
      let taxRatesResult = await client.getTaxRates();
      output.taxRates = (taxRatesResult.TaxRates || []).map(tr => ({
        name: tr.Name,
        taxType: tr.TaxType,
        effectiveRate: tr.EffectiveRate,
        status: tr.Status,
        canApplyToRevenue: tr.CanApplyToRevenue,
        canApplyToExpenses: tr.CanApplyToExpenses
      }));
    }

    if (include.includes('trackingCategories')) {
      let categoriesResult = await client.getTrackingCategories();
      output.trackingCategories = (categoriesResult.TrackingCategories || []).map(tc => ({
        trackingCategoryId: tc.TrackingCategoryID,
        name: tc.Name,
        status: tc.Status,
        options: tc.Options?.map(o => ({
          trackingOptionId: o.TrackingOptionID,
          name: o.Name,
          status: o.Status
        }))
      }));
    }

    if (include.includes('currencies')) {
      let currenciesResult = await client.getCurrencies();
      output.currencies = (currenciesResult.Currencies || []).map(c => ({
        code: c.Code,
        description: c.Description
      }));
    }

    if (include.includes('brandingThemes')) {
      let themesResult = await client.getBrandingThemes();
      output.brandingThemes = (themesResult.BrandingThemes || []).map(bt => ({
        brandingThemeId: bt.BrandingThemeID,
        name: bt.Name,
        sortOrder: bt.SortOrder
      }));
    }

    let parts: any[] = [];
    if (output.taxRates) parts.push(`${output.taxRates.length} tax rates`);
    if (output.trackingCategories)
      parts.push(`${output.trackingCategories.length} tracking categories`);
    if (output.currencies) parts.push(`${output.currencies.length} currencies`);
    if (output.brandingThemes) parts.push(`${output.brandingThemes.length} branding themes`);

    return {
      output,
      message: `Retrieved settings: ${parts.join(', ')}.`
    };
  })
  .build();

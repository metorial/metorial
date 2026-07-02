import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let vatRateSchema = z.object({
  vatId: z.number(),
  rate: z.number(),
  region: z.string().nullable().optional(),
  label: z.string().nullable().optional()
});

let classificationSchema = z.object({
  classificationId: z.number(),
  label: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  accountNumber: z.string().nullable().optional(),
  isProduct: z.boolean().nullable().optional(),
  isService: z.boolean().nullable().optional(),
  type: z.string().nullable().optional()
});

let unitSchema = z.object({
  unitId: z.number().optional(),
  label: z.string().nullable().optional()
});

export let getSettings = SlateTool.create(spec, {
  name: 'Get Settings',
  key: 'get_settings',
  description: `Retrieve account settings, available VAT rates, classifications (accounting registers), and units from Altoviz. Useful for looking up VAT rate IDs when creating invoices or quotes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeVatRates: z
        .boolean()
        .optional()
        .describe('Include list of available VAT rates (default: true)'),
      includeClassifications: z
        .boolean()
        .optional()
        .describe('Include list of classifications/accounting registers'),
      includeUnits: z.boolean().optional().describe('Include list of available units')
    })
  )
  .output(
    z.object({
      settings: z
        .record(z.string(), z.any())
        .describe('Account settings (timezone, logo, VAT number, VAT mode, etc.)'),
      vatRates: z.array(vatRateSchema).optional(),
      classifications: z.array(classificationSchema).optional(),
      units: z.array(unitSchema).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let settings = await client.getSettings();

    let vatRates: any[] | undefined;
    if (ctx.input.includeVatRates !== false) {
      let rawVats = await client.getVatRates();
      vatRates = rawVats.map((v: any) => ({
        vatId: v.id,
        rate: v.rate,
        region: v.region,
        label: v.label
      }));
    }

    let classifications: any[] | undefined;
    if (ctx.input.includeClassifications) {
      let rawClassifications = await client.getClassifications();
      classifications = rawClassifications.map((c: any) => ({
        classificationId: c.id,
        label: c.label,
        description: c.description,
        accountNumber: c.accountNumber,
        isProduct: c.isProduct,
        isService: c.isService,
        type: c.type
      }));
    }

    let units: any[] | undefined;
    if (ctx.input.includeUnits) {
      let rawUnits = await client.getUnits();
      units = rawUnits.map((u: any) => ({
        unitId: u.id,
        label: u.label
      }));
    }

    return {
      output: {
        settings,
        vatRates,
        classifications,
        units
      },
      message: `Retrieved account settings${vatRates ? ` with **${vatRates.length}** VAT rate(s)` : ''}${classifications ? `, **${classifications.length}** classification(s)` : ''}${units ? `, **${units.length}** unit(s)` : ''}.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let estimateEmploymentCost = SlateTool.create(spec, {
  name: 'Estimate Employment Cost',
  key: 'estimate_employment_cost',
  description: `Calculate estimated employment costs for a specific country before hiring. Returns a breakdown of employer costs including salary, taxes, benefits, and Remote fees. Useful for budgeting and comparing hiring costs across countries.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      countryCode: z.string().describe('ISO country code (e.g., GBR, DEU)'),
      salary: z.number().describe('Annual gross salary amount'),
      currency: z.string().describe('Currency code for the salary (e.g., USD, EUR, GBP)'),
      employerCurrencySlug: z
        .string()
        .optional()
        .describe('Employer currency slug for conversion'),
      age: z.number().optional().describe('Employee age (may affect cost in some countries)'),
      region: z.string().optional().describe('Region within the country (if applicable)')
    })
  )
  .output(
    z.object({
      estimation: z.record(z.string(), z.any()).describe('Cost estimation breakdown')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.auth.environment ?? 'production'
    });

    let result = await client.estimateEmploymentCost({
      countryCode: ctx.input.countryCode,
      salary: ctx.input.salary,
      currency: ctx.input.currency,
      employerCurrencySlug: ctx.input.employerCurrencySlug,
      age: ctx.input.age,
      region: ctx.input.region
    });

    let estimation = result?.data ?? result?.estimation ?? result;

    return {
      output: {
        estimation
      },
      message: `Estimated employment cost for **${ctx.input.salary} ${ctx.input.currency}** in **${ctx.input.countryCode}**.`
    };
  });

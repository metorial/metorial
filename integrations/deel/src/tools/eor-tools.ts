import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

export let getEorCountryGuide = SlateTool.create(spec, {
  name: 'Get EOR Country Guide',
  key: 'get_eor_country_guide',
  description: `Retrieve the Employer of Record (EOR) hiring guide for a specific country. Returns country-specific requirements, validations, and employment parameters needed to create an EOR contract.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      countryCode: z.string().describe('ISO country code (e.g. "US", "GB", "DE")')
    })
  )
  .output(
    z.object({
      guide: z
        .record(z.string(), z.any())
        .describe('Country-specific EOR hiring guide and validations')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.getEorCountryGuide(ctx.input.countryCode);
    let guide = result?.data ?? result;

    return {
      output: { guide },
      message: `Retrieved EOR hiring guide for country **${ctx.input.countryCode}**.`
    };
  })
  .build();

export let calculateEorCost = SlateTool.create(spec, {
  name: 'Calculate EOR Cost',
  key: 'calculate_eor_cost',
  description: `Calculate the estimated cost of hiring an employee through Deel's Employer of Record (EOR) service. Provides cost breakdown including employer contributions and Deel fees.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      countryCode: z.string().describe('ISO country code for the employee'),
      currencyCode: z.string().optional().describe('Currency code (e.g. "USD")'),
      salary: z.number().optional().describe('Annual or monthly salary amount'),
      salaryPeriod: z.string().optional().describe('Salary period: "annual" or "monthly"')
    })
  )
  .output(
    z.object({
      costBreakdown: z
        .record(z.string(), z.any())
        .describe('Estimated cost breakdown for EOR employment')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let data: Record<string, any> = {
      country_code: ctx.input.countryCode
    };
    if (ctx.input.currencyCode) data.currency_code = ctx.input.currencyCode;
    if (ctx.input.salary) data.salary = ctx.input.salary;
    if (ctx.input.salaryPeriod) data.salary_period = ctx.input.salaryPeriod;

    let result = await client.getEorCostCalculation(data);
    let costBreakdown = result?.data ?? result;

    return {
      output: { costBreakdown },
      message: `Calculated EOR cost for **${ctx.input.countryCode}**.`
    };
  })
  .build();

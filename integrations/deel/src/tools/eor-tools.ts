import { anyOf, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { dataObject, objectResponse, requireNumber, requireText } from '../lib/response';
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
  .scopes(anyOf('contracts:read'))
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

    if (!/^[A-Z]{2}$/.test(ctx.input.countryCode))
      throw createApiServiceError(
        'countryCode must be an uppercase two-letter ISO country code.'
      );
    let result = await client.getEorCountryGuide(ctx.input.countryCode);
    let guide = dataObject(result, 'EOR guide');

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
      salaryPeriod: z
        .string()
        .optional()
        .describe('Salary period: annual/ANNUALLY or monthly/MONTHLY'),
      countryName: z
        .string()
        .optional()
        .describe('Required full country name, for example Germany or United States')
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
    let country = requireText(ctx.input.countryName, 'countryName');
    let currency = requireText(ctx.input.currencyCode, 'currencyCode');
    requireNumber(ctx.input.salary, 'salary', 1);
    if (!/^[A-Z]{2}$/.test(ctx.input.countryCode) || !/^[A-Z]{3}$/.test(currency))
      throw createApiServiceError('Use uppercase ISO country and currency codes.');
    let salaryPeriod = ctx.input.salaryPeriod?.toUpperCase();
    if (salaryPeriod === 'ANNUAL') salaryPeriod = 'ANNUALLY';
    if (salaryPeriod !== undefined && !['ANNUALLY', 'MONTHLY'].includes(salaryPeriod))
      throw createApiServiceError('salaryPeriod must be annual/ANNUALLY or monthly/MONTHLY.');
    let client = createClient(ctx);
    let data = {
      country,
      currency,
      salary: ctx.input.salary,
      country_code: ctx.input.countryCode,
      ...(salaryPeriod ? { salary_period: salaryPeriod } : {})
    };
    let result = objectResponse(await client.getEorCostCalculation(data), 'EOR cost');
    // The reference documents an unwrapped body; the guide also shows a data envelope.
    let costBreakdown = result.data === undefined ? result : dataObject(result, 'EOR cost');
    if (!('costs' in costBreakdown || 'total_costs' in costBreakdown))
      throw createApiServiceError('Deel returned an invalid employment cost breakdown.');
    return {
      output: { costBreakdown },
      message: `Calculated EOR cost for **${ctx.input.countryCode}**.`
    };
  })
  .build();

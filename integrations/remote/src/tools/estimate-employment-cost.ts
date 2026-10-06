import { z } from 'zod';
import { collection } from '../lib/client';
import { remoteTool } from '../lib/tool';
import {
  country,
  currency,
  fail,
  id,
  integer,
  isRecord,
  type RecordData,
  record,
  recordSchema
} from '../lib/validation';
export let estimateEmploymentCost = remoteTool(
  {
    name: 'Estimate Employment Cost',
    key: 'estimate_employment_cost',
    description:
      'Estimate EOR employment costs using the current country/region catalog. Salary is an integer number of hundredths of the region currency, not a decimal major-unit amount. Estimates are indicative and may differ from actual hiring costs.',
    tags: { readOnly: true }
  },
  z.object({
    countryCode: z.string().optional(),
    salary: z
      .number()
      .describe(
        'Annual gross salary in integer hundredths of the local currency (5000000 means 50000.00). No implicit scaling.'
      ),
    currency: z
      .string()
      .describe('Local salary currency code; must match the chosen cost-calculator country.'),
    employerCurrencySlug: z
      .string()
      .optional()
      .describe(
        'Employer ISO currency code, such as USD. Despite the field name, current estimates expect a currency code.'
      ),
    age: z.number().optional(),
    region: z
      .string()
      .optional()
      .describe(
        'Existing region code/name/slug, resolved exactly against the current catalog.'
      ),
    regionSlug: z
      .string()
      .optional()
      .describe('Exact region slug from list_countries with catalog cost_calculator.'),
    employmentTerm: z.enum(['fixed', 'indefinite']).optional(),
    benefits: z
      .array(z.object({ benefitGroupSlug: z.string(), benefitTierSlug: z.string() }))
      .optional(),
    includeBenefits: z.boolean().optional(),
    includeCostBreakdowns: z.boolean().optional()
  }),
  z.object({ estimation: recordSchema }),
  async (client, input) => {
    let catalog = collection(await client.get('/cost-calculator/countries'), 'countries');
    let code = input.countryCode === undefined ? undefined : country(input.countryCode);
    let options: { row: RecordData; slug: string; code?: string; name?: string }[] = [];
    for (let row of catalog) {
      if (code && row.code !== code) continue;
      if (typeof row.region_slug === 'string')
        options.push({
          row,
          slug: row.region_slug,
          code: typeof row.code === 'string' ? row.code : undefined,
          name: typeof row.name === 'string' ? row.name : undefined
        });
      if (Array.isArray(row.child_regions))
        for (let region of row.child_regions)
          if (isRecord(region) && typeof region.slug === 'string')
            options.push({
              row,
              slug: region.slug,
              code: typeof region.code === 'string' ? region.code : undefined,
              name: typeof region.name === 'string' ? region.name : undefined
            });
    }
    if (!code && !input.regionSlug)
      fail(
        'Provide countryCode or an exact regionSlug discovered through list_countries with catalog cost_calculator.'
      );
    let selector = input.regionSlug ?? input.region;
    let matches = selector
      ? options.filter(
          option =>
            option.slug === selector ||
            (input.regionSlug === undefined &&
              (option.code === selector || option.name === selector))
        )
      : options;
    matches = [...new Map(matches.map(option => [option.slug, option])).values()];
    if (matches.length !== 1)
      fail(
        'The country/region selection is missing or ambiguous. Read list_countries with catalog cost_calculator and provide one exact regionSlug.'
      );
    let selected = matches[0];
    if (!selected) fail('No supported cost-calculator region was selected.');
    if (
      input.regionSlug &&
      input.region &&
      input.region !== selected.slug &&
      input.region !== selected.code &&
      input.region !== selected.name
    )
      fail('region and regionSlug select different regions.');
    let localCurrency = isRecord(selected.row.currency)
      ? selected.row.currency.code
      : undefined;
    if (currency(input.currency) !== localCurrency)
      fail(
        'currency must match the selected region currency. The salary field is denominated in that currency; no implicit conversion is performed.'
      );
    let employment = {
      region_slug: id(selected.slug, 'Region slug'),
      annual_gross_salary: integer(input.salary, 'Annual salary'),
      age: input.age === undefined ? undefined : integer(input.age, 'Age'),
      employment_term: input.employmentTerm,
      benefits: input.benefits?.map(benefit => ({
        benefit_group_slug: id(benefit.benefitGroupSlug),
        benefit_tier_slug: id(benefit.benefitTierSlug)
      }))
    };
    let value = await client.post('/cost-calculator/estimation', {
      employer_currency_slug: currency(input.employerCurrencySlug ?? input.currency),
      employments: [employment],
      include_benefits: input.includeBenefits,
      include_cost_breakdowns: input.includeCostBreakdowns
    });
    let estimation = record(record(value, 'cost estimate response').data, 'cost estimate');
    if (!Array.isArray(estimation.employments) || !estimation.employments.length)
      fail(
        'Remote did not return estimated employments. Check region requirements with get_country_form_schema action cost_region_fields.'
      );
    return {
      output: { estimation },
      message:
        'Remote returned an indicative employment cost estimate. Actual costs and hiring eligibility are not guaranteed.'
    };
  }
);

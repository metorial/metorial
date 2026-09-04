import { SlateTool } from 'slates';
import { z } from 'zod';
import { CompaniesHouseClient } from '../lib/client';
import {
  companySearchOutputSchema,
  isoDateSchema,
  paginationFields,
  querySchema,
  trimmedStringSchema
} from '../lib/schemas';
import { spec } from '../spec';

const restrictionsSchema = z
  .array(z.enum(['active-companies', 'legally-equivalent-company-name']))
  .min(1)
  .refine(values => new Set(values).size === values.length, {
    message: 'Restrictions must not contain duplicate values.'
  });

const advancedListSchema = z.array(trimmedStringSchema).min(1);

const advancedCompanySearchInputSchema = z
  .object({
    nameIncludes: trimmedStringSchema
      .optional()
      .describe('Text that the company name must include.'),
    nameExcludes: trimmedStringSchema
      .optional()
      .describe('Text that the company name must not include.'),
    companyStatuses: advancedListSchema
      .optional()
      .describe('Company statuses to include, such as active or dissolved.'),
    companyTypes: advancedListSchema
      .optional()
      .describe('Company types to include, such as ltd or plc.'),
    companySubtypes: advancedListSchema.optional().describe('Company subtypes to include.'),
    incorporatedFrom: isoDateSchema
      .optional()
      .describe('Earliest incorporation date, in YYYY-MM-DD format.'),
    incorporatedTo: isoDateSchema
      .optional()
      .describe('Latest incorporation date, in YYYY-MM-DD format.'),
    dissolvedFrom: isoDateSchema
      .optional()
      .describe('Earliest dissolution date, in YYYY-MM-DD format.'),
    dissolvedTo: isoDateSchema
      .optional()
      .describe('Latest dissolution date, in YYYY-MM-DD format.'),
    location: trimmedStringSchema
      .optional()
      .describe('Registered-office location text to match.'),
    sicCodes: advancedListSchema
      .optional()
      .describe('Standard Industrial Classification codes to include.'),
    ...paginationFields
  })
  .superRefine((input, ctx) => {
    let hasBusinessFilter =
      input.nameIncludes !== undefined ||
      input.nameExcludes !== undefined ||
      input.companyStatuses !== undefined ||
      input.companyTypes !== undefined ||
      input.companySubtypes !== undefined ||
      input.incorporatedFrom !== undefined ||
      input.incorporatedTo !== undefined ||
      input.dissolvedFrom !== undefined ||
      input.dissolvedTo !== undefined ||
      input.location !== undefined ||
      input.sicCodes !== undefined;
    if (!hasBusinessFilter) {
      ctx.addIssue({
        code: 'custom',
        message: 'Provide at least one company search filter.'
      });
    }
    if (
      input.incorporatedFrom !== undefined &&
      input.incorporatedTo !== undefined &&
      input.incorporatedFrom > input.incorporatedTo
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['incorporatedTo'],
        message: 'incorporatedTo must not be earlier than incorporatedFrom.'
      });
    }
    if (
      input.dissolvedFrom !== undefined &&
      input.dissolvedTo !== undefined &&
      input.dissolvedFrom > input.dissolvedTo
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['dissolvedTo'],
        message: 'dissolvedTo must not be earlier than dissolvedFrom.'
      });
    }
  });

export let searchCompanies = SlateTool.create(spec, {
  name: 'Search Companies',
  key: 'search_companies',
  description:
    "Search the Companies House register by company name or company number. Combining active-companies with legally-equivalent-company-name uses the provider's company-name availability behavior.",
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      query: querySchema.describe('Company name or company number search text.'),
      restrictions: restrictionsSchema
        .optional()
        .describe('Optional provider search restrictions. Values are combined together.'),
      ...paginationFields
    })
  )
  .output(companySearchOutputSchema)
  .handleInvocation(async ctx => {
    let result = await new CompaniesHouseClient(ctx.auth).searchCompanies(ctx.input);
    return {
      output: result,
      message: `Found **${result.totalResults}** matching companies.`
    };
  })
  .build();

export let searchCompaniesAdvanced = SlateTool.create(spec, {
  name: 'Search Companies Advanced',
  key: 'search_companies_advanced',
  description:
    'Search companies using status, type, subtype, incorporation or dissolution dates, location, SIC codes, and name include or exclude filters.',
  tags: { readOnly: true, destructive: false }
})
  .input(advancedCompanySearchInputSchema)
  .output(companySearchOutputSchema)
  .handleInvocation(async ctx => {
    let result = await new CompaniesHouseClient(ctx.auth).searchCompaniesAdvanced({
      companyNameIncludes: ctx.input.nameIncludes,
      companyNameExcludes: ctx.input.nameExcludes,
      companyStatus: ctx.input.companyStatuses,
      companyType: ctx.input.companyTypes,
      companySubtype: ctx.input.companySubtypes,
      incorporatedFrom: ctx.input.incorporatedFrom,
      incorporatedTo: ctx.input.incorporatedTo,
      dissolvedFrom: ctx.input.dissolvedFrom,
      dissolvedTo: ctx.input.dissolvedTo,
      location: ctx.input.location,
      sicCodes: ctx.input.sicCodes,
      itemsPerPage: ctx.input.itemsPerPage,
      startIndex: ctx.input.startIndex
    });
    return {
      output: result,
      message: `Found **${result.totalResults}** matching companies.`
    };
  })
  .build();

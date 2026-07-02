import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import {
  companySchema,
  companySlugFor,
  companySlugInput,
  createClient,
  listMetadata,
  mapCompany,
  paginationInputShape,
  paginationOutputShape,
  paginationParams
} from './shared';

let companySortSchema = z.enum([
  'createdDate asc',
  'createdDate desc',
  'name asc',
  'name desc',
  'organizationNumber asc',
  'organizationNumber desc'
]);

export let listCompanies = SlateTool.create(spec, {
  name: 'List Companies',
  key: 'list_companies',
  description:
    'Lists Fiken companies that the authenticated user has granted this app access to. Use this before company-scoped tools when the company slug is unknown.',
  constraints: [
    'Fiken company listing supports pagination and sorting, but no server-side name filter.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: paginationInputShape.page,
      pageSize: paginationInputShape.pageSize,
      sortBy: companySortSchema.optional().describe('Sort order for returned companies.')
    })
  )
  .output(
    z.object({
      companies: z.array(companySchema),
      ...paginationOutputShape
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.listCompanies(
      pickDefined({
        ...paginationParams(ctx.input),
        sortBy: ctx.input.sortBy
      })
    );
    let companies = response.items.map(mapCompany);

    return {
      output: {
        companies,
        ...listMetadata(response)
      },
      message: `Found **${companies.length}** Fiken compan${companies.length === 1 ? 'y' : 'ies'}.`
    };
  })
  .build();

export let getCompany = SlateTool.create(spec, {
  name: 'Get Company',
  key: 'get_company',
  description: 'Retrieves one Fiken company by company slug.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companySlug: companySlugInput.describe(
        'Fiken company slug from list_companies. Omit only when defaultCompanySlug is configured.'
      )
    })
  )
  .output(companySchema)
  .handleInvocation(async ctx => {
    let companySlug = companySlugFor(ctx, ctx.input.companySlug);
    let client = createClient(ctx);
    let company = mapCompany(await client.getCompany(companySlug));

    return {
      output: company,
      message: `Retrieved Fiken company **${company.name ?? company.companySlug ?? companySlug}**.`
    };
  })
  .build();

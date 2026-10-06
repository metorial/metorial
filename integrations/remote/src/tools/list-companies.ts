import { z } from 'zod';
import { collection } from '../lib/client';
import { remoteTool } from '../lib/tool';
import { integer, pageSchema, pageSizeSchema, record, recordSchema } from '../lib/validation';
export let listCompanies = remoteTool(
  {
    name: 'List Companies',
    key: 'list_companies',
    description:
      'Discover companies accessible through the token. Company and customer tokens return their actual company identity summary. Partner client-credentials identity permits the documented company list. Pagination is applied locally to the returned collection.',
    tags: { readOnly: true }
  },
  z.object({ page: pageSchema, pageSize: pageSizeSchema }),
  z.object({
    companies: z.array(recordSchema),
    totalCount: z.number().optional(),
    currentPage: z.number().optional(),
    hasMore: z.boolean().optional(),
    detailLevel: z.enum(['identity_summary', 'company_records'])
  }),
  async (client, input) => {
    let { identity, mode } = await client.getIdentity();
    let companies =
      mode === 'partner_client_credentials'
        ? collection(await client.get('/companies'), 'companies')
        : [record(identity.company, 'authenticated company')];
    let page = input.page === undefined ? 1 : integer(input.page, 'Page', 1);
    let size =
      input.pageSize === undefined
        ? Math.max(1, companies.length)
        : integer(input.pageSize, 'Page size', 1, 100);
    let start = (page - 1) * size;
    let output = {
      companies: companies.slice(start, start + size),
      totalCount: companies.length,
      currentPage: page,
      hasMore: start + size < companies.length,
      detailLevel:
        mode === 'partner_client_credentials'
          ? ('company_records' as const)
          : ('identity_summary' as const)
    };
    return {
      output,
      message:
        mode === 'partner_client_credentials'
          ? 'Retrieved the documented partner company collection.'
          : 'Retrieved the company identity summary for this company-scoped connection.'
    };
  }
);

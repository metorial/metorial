import { SlateTool } from 'slates';
import { z } from 'zod';
import { MagneticClient } from '../lib/client';
import { spec } from '../spec';

export let listCompanies = SlateTool.create(spec, {
  name: 'List Companies',
  key: 'list_companies',
  description:
    'Retrieve companies available to the connected Magnetic user, including their IDs and provider details. Use company IDs to associate contacts or opportunities with an existing company.',
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      companies: z.array(
        z.object({
          companyId: z.string().describe('ID to use when referring to this company'),
          details: z
            .record(z.string(), z.unknown())
            .describe('Company details returned by Magnetic')
        })
      ),
      totalCount: z.number().describe('Number of companies returned by the API')
    })
  )
  .handleInvocation(async ctx => {
    let records = await new MagneticClient({ token: ctx.auth.token }).listCompanies();
    let companies = records.map(company => ({
      companyId: String(company.id),
      details: company
    }));
    return {
      output: { companies, totalCount: companies.length },
      message: `Retrieved ${companies.length} compan${companies.length === 1 ? 'y' : 'ies'}.`
    };
  })
  .build();

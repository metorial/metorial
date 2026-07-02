import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../spec';
import {
  buildODataParams,
  compactRecord,
  createClient,
  environmentInputFields,
  listInputFields,
  pageOutputSchema,
  pageSummary,
  rawRecordSchema,
  stringValue
} from './shared';

let companySchema = z.object({
  id: z.string().optional().describe('Business Central company GUID.'),
  name: z.string().optional().describe('Company name.'),
  displayName: z.string().optional().describe('Human-readable company display name.'),
  businessProfileId: z.string().optional().describe('Business profile id when available.'),
  systemVersion: z.string().optional().describe('Business Central system version.'),
  record: rawRecordSchema
});

let mapCompany = (record: Record<string, unknown>) => ({
  ...compactRecord({
    id: stringValue(record, 'id'),
    name: stringValue(record, 'name'),
    displayName: stringValue(record, 'displayName'),
    businessProfileId: stringValue(record, 'businessProfileId'),
    systemVersion: stringValue(record, 'systemVersion')
  }),
  record
});

export let listCompanies = SlateTool.create(spec, {
  name: 'List Business Central Companies',
  key: 'list_companies',
  description:
    'List companies available to the authenticated Microsoft Dynamics 365 Business Central user in the selected environment. Use a returned company id as companyId for company-scoped tools.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...environmentInputFields,
      ...listInputFields
    })
  )
  .output(
    z.object({
      companies: z.array(companySchema).describe('Business Central companies.'),
      page: pageOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { params, page } = buildODataParams(ctx, ctx.input);
    let response = await client.getList<Record<string, unknown>>(
      'list companies',
      '/companies',
      params
    );
    let companies = response.value!.map(mapCompany);

    return {
      output: {
        companies,
        page: pageSummary(response, page)
      },
      message: `Found **${companies.length}** Business Central company record(s).`
    };
  })
  .build();

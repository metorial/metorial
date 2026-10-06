import { z } from 'zod';
import { collection, pageOutput, pageParams } from '../lib/client';
import { remoteTool } from '../lib/tool';
import {
  id,
  pageSchema,
  pageSizeSchema,
  paginationOutput,
  recordSchema
} from '../lib/validation';
export let listEmployments = remoteTool(
  {
    name: 'List Employments',
    key: 'list_employments',
    description:
      'List accessible employments with documented company, status, name, email, and employment-type filters. Returns provider pagination metadata; deleted employments are excluded.',
    tags: { readOnly: true }
  },
  z.object({
    companyId: z.string().optional(),
    status: z.string().optional(),
    page: pageSchema,
    pageSize: pageSizeSchema,
    email: z.string().optional(),
    name: z.string().optional(),
    employmentType: z.string().optional(),
    employmentModel: z.string().optional(),
    partnerExternalId: z.string().optional()
  }),
  z.object({ employments: z.array(recordSchema), ...paginationOutput }),
  async (client, input) => {
    let value = await client.get('/employments', {
      ...pageParams(input),
      company_id: input.companyId === undefined ? undefined : id(input.companyId),
      status: input.status,
      email: input.email,
      name: input.name,
      employment_type: input.employmentType,
      employment_model: input.employmentModel,
      partner_external_id: input.partnerExternalId
    });
    return {
      output: { employments: collection(value, 'employments'), ...pageOutput(value) },
      message: 'Retrieved an employment page.'
    };
  }
);

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
export let listContractAmendments = remoteTool(
  {
    name: 'List Contract Amendments',
    key: 'list_contract_amendments',
    description:
      'List contract amendments with optional employment and status filters and actual provider pagination.',
    tags: { readOnly: true }
  },
  z.object({
    employmentId: z.string().optional(),
    status: z.string().optional(),
    page: pageSchema,
    pageSize: pageSizeSchema
  }),
  z.object({ contractAmendments: z.array(recordSchema), ...paginationOutput }),
  async (client, input) => {
    let value = await client.get('/contract-amendments', {
      ...pageParams(input),
      employment_id: input.employmentId === undefined ? undefined : id(input.employmentId),
      status: input.status
    });
    return {
      output: {
        contractAmendments: collection(value, 'contract_amendments'),
        ...pageOutput(value)
      },
      message: 'Retrieved a contract amendment page.'
    };
  }
);

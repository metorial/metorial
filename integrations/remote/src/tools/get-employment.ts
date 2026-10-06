import { z } from 'zod';
import { remoteTool } from '../lib/tool';
import { idSchema, recordSchema } from '../lib/validation';
export let getEmployment = remoteTool(
  {
    name: 'Get Employment',
    key: 'get_employment',
    description:
      'Read an employment by ID from list_employments, including current status and available country-specific fields.',
    tags: { readOnly: true }
  },
  z.object({ employmentId: idSchema }),
  z.object({ employment: recordSchema }),
  async (client, input) => ({
    output: { employment: await client.employment(input.employmentId) },
    message: 'Retrieved the current employment record.'
  })
);

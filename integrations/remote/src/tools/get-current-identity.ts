import { z } from 'zod';
import { remoteTool } from '../lib/tool';
import { recordSchema } from '../lib/validation';
export let getCurrentIdentity = remoteTool(
  {
    name: 'Get Current Identity',
    key: 'get_current_identity',
    description:
      'Identify the company, authorizing user, and integration accessible through this Remote token. Token mode determines which entities are present.',
    tags: { readOnly: true }
  },
  z.object({}),
  z.object({
    identity: recordSchema,
    tokenMode: z.enum(['company_oauth', 'customer_token', 'partner_client_credentials'])
  }),
  async client => {
    let result = await client.getIdentity();
    return {
      output: { identity: result.identity, tokenMode: result.mode },
      message: 'Retrieved the current Remote token identity.'
    };
  }
);

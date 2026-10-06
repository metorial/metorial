import { z } from 'zod';
import { tool } from '../lib/tool';
export const getCurrentAccount = tool({
  name: 'Get Current Account',
  key: 'get_current_account',
  description:
    'Discover the connected identity, account subdomain and API environment. The identity ID is an internal identifier, not a document or contact ID.',
  readOnly: true,
  input: {},
  output: {
    identityId: z.string(),
    name: z.string().optional(),
    email: z.string().optional(),
    accountName: z.string(),
    apiEndpoint: z.string(),
    environment: z.enum(['production', 'sandbox'])
  },
  run: async (_, client) => client.authorization()
});

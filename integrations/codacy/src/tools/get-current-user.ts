import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, requireCodacyNumber, requireCodacyString } from '../lib/helpers';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Get the Codacy account authenticated by the API token, including its ID, email, name, and active status.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      id: z.number().describe('Codacy account ID.'),
      email: z.string().describe('Primary account email.'),
      name: z.string().optional(),
      isActive: z.boolean().optional(),
      isAdmin: z.boolean().optional(),
      created: z.string().optional(),
      raw: z.unknown().describe('Original Codacy user response.')
    })
  )
  .handleInvocation(async ctx => {
    let response = await createClient(ctx).getCurrentUser();
    let user = response.data ?? response;
    return {
      output: {
        id: requireCodacyNumber(user.id, 'user.id'),
        email: requireCodacyString(user.mainEmail, 'user.mainEmail'),
        name: user.name,
        isActive: user.isActive,
        isAdmin: user.isAdmin,
        created: user.created,
        raw: response
      },
      message: 'Retrieved the authenticated Codacy account.'
    };
  })
  .build();

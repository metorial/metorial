import { SlateTool } from 'slates';
import { z } from 'zod';
import { AblyControlClient } from '../lib/control-client';
import { spec } from '../spec';

export let whoAmI = SlateTool.create(spec, {
  name: 'Get Current Account and Token',
  key: 'who_am_i',
  description:
    'Retrieve the Control API token metadata, its user, and its account. Discover the account ID before listing apps with manage_apps.',
  instructions: [
    'Requires Control API Token authentication. Pub/Sub API keys cannot access this endpoint.'
  ],
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z
        .string()
        .optional()
        .describe('Account ID for manage_apps and get_control_statistics'),
      accountName: z.string().optional().describe('Account name'),
      userId: z.number().optional().describe('User ID associated with the token'),
      email: z.string().optional().describe('User email'),
      token: z
        .any()
        .optional()
        .describe(
          'Token metadata including capabilities and actual nullable expiration/last-used dates'
        ),
      raw: z.any().describe('Complete Control API identity response')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new AblyControlClient(
      ctx.auth.token,
      ctx.auth.authType
    ).getTokenDetails();
    return {
      output: {
        accountId: result.account?.id,
        accountName: result.account?.name,
        userId: result.user?.id,
        email: result.user?.email,
        token: result.token,
        raw: result
      },
      message: 'Retrieved the current Control API account, user, and token metadata.'
    };
  })
  .build();

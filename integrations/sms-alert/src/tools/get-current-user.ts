import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmsAlertClient } from '../lib/client';
import { spec } from '../spec';

export const getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the connected SMS Alert account profile, including its user ID, username, contact information, expiry date, and verification state.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      status: z.string().describe('Status of the API response.'),
      description: z
        .unknown()
        .describe('The connected account profile, including stable account identifiers.')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new SmsAlertClient(ctx.auth).getProfile();
    return { output: result, message: 'Retrieved the connected SMS Alert account profile.' };
  })
  .build();

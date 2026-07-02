import { SlateTool } from 'slates';
import { z } from 'zod';
import { RipplingClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: `Retrieve information about the Rippling user whose access token is being used. Useful for SSO flows and identifying the authenticated user. Returns the user's ID, work email, and company ID.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('Unique user identifier'),
      workEmail: z.string().optional().describe('User work email address'),
      companyId: z.string().optional().describe('Company identifier the user belongs to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RipplingClient({ token: ctx.auth.token });
    let user = await client.getCurrentUser();

    return {
      output: {
        userId: user.id || '',
        workEmail: user.workEmail,
        companyId: user.companyId
      },
      message: `Current user: **${user.workEmail || user.id}** (Company: ${user.companyId || 'unknown'}).`
    };
  })
  .build();

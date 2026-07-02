import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProfile = SlateTool.create(spec, {
  name: 'Get Profile',
  key: 'get_profile',
  description: `Retrieve the authenticated user's profile information, including account details, company info, and optionally dashboard assignments and permissions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeDetails: z
        .boolean()
        .optional()
        .describe('Include tab instances, dashboard properties, and permissions')
    })
  )
  .output(
    z.object({
      userId: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      companyId: z.string().optional(),
      companyName: z.string().optional(),
      dateLastLogin: z.string().optional(),
      dateCreated: z.string().optional(),
      isLockedOut: z.boolean().optional(),
      tabInstances: z.array(z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let profile = await client.getProfile(ctx.input.includeDetails);

    return {
      output: {
        userId: profile?.id,
        firstName: profile?.first_name,
        lastName: profile?.last_name,
        email: profile?.email,
        companyId: profile?.company?.id,
        companyName: profile?.company?.name,
        dateLastLogin: profile?.date_last_login,
        dateCreated: profile?.date_created,
        isLockedOut: profile?.is_locked_out,
        tabInstances: profile?.tab_instances
      },
      message: `Profile: **${profile?.first_name} ${profile?.last_name}** (${profile?.email}) — ${profile?.company?.name || 'unknown company'}.`
    };
  })
  .build();

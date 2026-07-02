import { SlateTool } from 'slates';
import { z } from 'zod';
import { HubClient } from '../lib/client';
import { spec } from '../spec';

export let getUserInfoTool = SlateTool.create(spec, {
  name: 'Get User Info',
  key: 'get_user_info',
  description: `Get information about the authenticated user, including username, email, organizations, and account details.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().optional().describe('User ID'),
      username: z.string().describe('Username'),
      fullName: z.string().optional().describe('Full display name'),
      email: z.string().optional().describe('Email address'),
      avatarUrl: z.string().optional().describe('Profile avatar URL'),
      isPro: z.boolean().optional().describe('Whether the user has a Pro account'),
      organizations: z
        .array(
          z.object({
            organizationId: z.string().optional().describe('Organization ID'),
            name: z.string().describe('Organization name'),
            fullName: z.string().optional().describe('Display name'),
            isEnterprise: z.boolean().optional().describe('Whether it is an enterprise org')
          })
        )
        .optional()
        .describe('Organizations the user belongs to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubClient({ token: ctx.auth.token });
    let info = await client.whoami();

    let organizations = (info.orgs || []).map((org: any) => ({
      organizationId: org.id || org._id,
      name: org.name,
      fullName: org.fullname,
      isEnterprise: org.isEnterprise
    }));

    return {
      output: {
        userId: info.id || info._id,
        username: info.name,
        fullName: info.fullname,
        email: info.email,
        avatarUrl: info.avatarUrl,
        isPro: info.isPro,
        organizations
      },
      message: `Authenticated as **${info.name}**${info.orgs?.length ? ` (member of ${info.orgs.length} org(s))` : ''}.`
    };
  })
  .build();

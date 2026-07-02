import { SlateTool } from 'slates';
import { z } from 'zod';
import { HootsuiteClient } from '../lib/client';
import { spec } from '../spec';

export let getUserInfoTool = SlateTool.create(spec, {
  name: 'Get User Info',
  key: 'get_user_info',
  description: `Retrieve the authenticated user's profile information and their associated organizations.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      memberId: z.string().describe('Hootsuite member ID'),
      fullName: z.string().optional().describe('Full name'),
      email: z.string().optional().describe('Email address'),
      language: z.string().optional().describe('Preferred language'),
      timezone: z.string().optional().describe('Timezone'),
      companyName: z.string().optional().describe('Company name'),
      organizations: z
        .array(
          z.object({
            organizationId: z.string().describe('Organization ID'),
            name: z.string().optional().describe('Organization name')
          })
        )
        .describe('Organizations the user belongs to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HootsuiteClient(ctx.auth.token);

    let me = await client.getMe();
    let orgs = await client.getMyOrganizations();

    let organizations = (orgs || []).map((org: any) => ({
      organizationId: String(org.id),
      name: org.name
    }));

    return {
      output: {
        memberId: String(me.id),
        fullName: me.fullName,
        email: me.email,
        language: me.language,
        timezone: me.timezone,
        companyName: me.companyName,
        organizations
      },
      message: `Authenticated as **${me.fullName || me.email}** (ID: ${me.id}) with access to **${organizations.length}** organization(s).`
    };
  })
  .build();

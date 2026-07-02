import { SlateTool } from 'slates';
import { z } from 'zod';
import { OktaClient } from '../lib/client';
import { spec } from '../spec';

export let getUserTool = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve detailed information about a specific Okta user by their user ID or login. Returns full profile, status, credentials provider, and group/app memberships.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('Okta user ID or login (email)'),
      includeGroups: z
        .boolean()
        .optional()
        .describe("Also fetch the user's group memberships"),
      includeApps: z
        .boolean()
        .optional()
        .describe("Also fetch the user's assigned applications")
    })
  )
  .output(
    z.object({
      userId: z.string().describe('Unique Okta user ID'),
      status: z.string().describe('Current user status'),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      login: z.string().optional(),
      mobilePhone: z.string().optional(),
      title: z.string().optional(),
      department: z.string().optional(),
      organization: z.string().optional(),
      created: z.string(),
      lastLogin: z.string().optional(),
      lastUpdated: z.string(),
      passwordChanged: z.string().optional(),
      credentialProvider: z.string().optional().describe('Identity provider type'),
      profile: z.record(z.string(), z.any()).optional().describe('Full profile attributes'),
      groups: z
        .array(
          z.object({
            groupId: z.string(),
            name: z.string(),
            type: z.string()
          })
        )
        .optional()
        .describe('User group memberships'),
      apps: z
        .array(
          z.object({
            appName: z.string(),
            appInstanceId: z.string(),
            label: z.string()
          })
        )
        .optional()
        .describe('Assigned application links')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OktaClient({
      domain: ctx.config.domain,
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let user = await client.getUser(ctx.input.userId);

    let groups: Array<{ groupId: string; name: string; type: string }> | undefined;
    if (ctx.input.includeGroups) {
      let userGroups = await client.getUserGroups(user.id);
      groups = userGroups.map(g => ({
        groupId: g.id,
        name: g.profile.name,
        type: g.type
      }));
    }

    let apps: Array<{ appName: string; appInstanceId: string; label: string }> | undefined;
    if (ctx.input.includeApps) {
      let userApps = await client.getUserApps(user.id);
      apps = userApps.map((a: any) => ({
        appName: a.appName || '',
        appInstanceId: a.appInstanceId || '',
        label: a.label || ''
      }));
    }

    return {
      output: {
        userId: user.id,
        status: user.status,
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        email: user.profile.email,
        login: user.profile.login,
        mobilePhone: user.profile.mobilePhone || undefined,
        title: user.profile.title,
        department: user.profile.department,
        organization: user.profile.organization,
        created: user.created,
        lastLogin: user.lastLogin || undefined,
        lastUpdated: user.lastUpdated,
        passwordChanged: user.passwordChanged || undefined,
        credentialProvider: user.credentials?.provider?.type,
        profile: user.profile,
        groups,
        apps
      },
      message: `Retrieved user **${user.profile.firstName} ${user.profile.lastName}** (${user.profile.email}) — status: ${user.status}.`
    };
  })
  .build();

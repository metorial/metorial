import { SlateTool } from 'slates';
import { z } from 'zod';
import { OktaClient } from '../lib/client';
import { spec } from '../spec';

export let createUserTool = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description: `Create a new user in Okta. Supports setting profile attributes, optional password/recovery question, and optionally assigning the user to groups during creation.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      firstName: z.string().describe('First name'),
      lastName: z.string().describe('Last name'),
      email: z.string().describe('Primary email address (also used as login)'),
      login: z
        .string()
        .optional()
        .describe('Okta login identifier. Defaults to email if not provided'),
      mobilePhone: z.string().optional().describe('Mobile phone number'),
      title: z.string().optional().describe('Job title'),
      department: z.string().optional().describe('Department'),
      organization: z.string().optional().describe('Organization'),
      additionalProfile: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional custom profile attributes'),
      password: z
        .string()
        .optional()
        .describe(
          'Initial password for the user. If omitted, user will be emailed an activation link'
        ),
      groupIds: z.array(z.string()).optional().describe('IDs of groups to assign the user to'),
      activate: z
        .boolean()
        .optional()
        .describe(
          'Activate the user immediately (default true). If false, the user is created in STAGED status'
        )
    })
  )
  .output(
    z.object({
      userId: z.string().describe('Unique Okta user ID'),
      status: z.string().describe('User status after creation'),
      login: z.string().optional(),
      email: z.string().optional(),
      created: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new OktaClient({
      domain: ctx.config.domain,
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let profile: Record<string, any> = {
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      email: ctx.input.email,
      login: ctx.input.login || ctx.input.email,
      ...(ctx.input.mobilePhone ? { mobilePhone: ctx.input.mobilePhone } : {}),
      ...(ctx.input.title ? { title: ctx.input.title } : {}),
      ...(ctx.input.department ? { department: ctx.input.department } : {}),
      ...(ctx.input.organization ? { organization: ctx.input.organization } : {}),
      ...ctx.input.additionalProfile
    };

    let credentials: Record<string, any> | undefined;
    if (ctx.input.password) {
      credentials = {
        password: { value: ctx.input.password }
      };
    }

    let user = await client.createUser({
      profile,
      credentials,
      groupIds: ctx.input.groupIds,
      activate: ctx.input.activate
    });

    return {
      output: {
        userId: user.id,
        status: user.status,
        login: user.profile.login,
        email: user.profile.email,
        created: user.created
      },
      message: `Created user **${user.profile.firstName} ${user.profile.lastName}** (${user.profile.email}) with status ${user.status}.`
    };
  })
  .build();

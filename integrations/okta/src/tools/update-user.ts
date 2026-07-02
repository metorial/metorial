import { SlateTool } from 'slates';
import { z } from 'zod';
import { OktaClient } from '../lib/client';
import { spec } from '../spec';

export let updateUserTool = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description: `Update an existing Okta user's profile attributes. Only the provided fields will be updated; omitted fields remain unchanged.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      userId: z.string().describe('Okta user ID or login'),
      firstName: z.string().optional().describe('Updated first name'),
      lastName: z.string().optional().describe('Updated last name'),
      email: z.string().optional().describe('Updated primary email'),
      login: z.string().optional().describe('Updated login identifier'),
      mobilePhone: z.string().optional().describe('Updated mobile phone'),
      title: z.string().optional().describe('Updated job title'),
      department: z.string().optional().describe('Updated department'),
      organization: z.string().optional().describe('Updated organization'),
      additionalProfile: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional custom profile attributes to update')
    })
  )
  .output(
    z.object({
      userId: z.string(),
      status: z.string(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      login: z.string().optional(),
      lastUpdated: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new OktaClient({
      domain: ctx.config.domain,
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let profile: Record<string, any> = {};
    if (ctx.input.firstName !== undefined) profile.firstName = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) profile.lastName = ctx.input.lastName;
    if (ctx.input.email !== undefined) profile.email = ctx.input.email;
    if (ctx.input.login !== undefined) profile.login = ctx.input.login;
    if (ctx.input.mobilePhone !== undefined) profile.mobilePhone = ctx.input.mobilePhone;
    if (ctx.input.title !== undefined) profile.title = ctx.input.title;
    if (ctx.input.department !== undefined) profile.department = ctx.input.department;
    if (ctx.input.organization !== undefined) profile.organization = ctx.input.organization;
    if (ctx.input.additionalProfile) {
      Object.assign(profile, ctx.input.additionalProfile);
    }

    let user = await client.updateUser(ctx.input.userId, { profile });

    return {
      output: {
        userId: user.id,
        status: user.status,
        firstName: user.profile.firstName,
        lastName: user.profile.lastName,
        email: user.profile.email,
        login: user.profile.login,
        lastUpdated: user.lastUpdated
      },
      message: `Updated user **${user.profile.firstName} ${user.profile.lastName}** (${user.id}).`
    };
  })
  .build();

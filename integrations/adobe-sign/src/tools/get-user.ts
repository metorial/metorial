import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve detailed information for a user in the Adobe Acrobat Sign account, including status, role flags, locale, company, and group/account metadata returned by the API.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('ID of the Adobe Acrobat Sign user to retrieve')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('ID of the user'),
      email: z.string().optional().describe('Email address'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      company: z.string().optional().describe('Company name'),
      locale: z.string().optional().describe('User locale'),
      status: z.string().optional().describe('User status'),
      isAccountAdmin: z.boolean().optional().describe('Whether the user is an account admin'),
      raw: z.any().describe('Raw user detail returned by Adobe Acrobat Sign')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl,
      shard: ctx.auth.shard
    });

    let user = await client.getUser(ctx.input.userId);

    return {
      output: {
        userId: user.id || ctx.input.userId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        company: user.company,
        locale: user.locale,
        status: user.status,
        isAccountAdmin: user.isAccountAdmin,
        raw: user
      },
      message: `Retrieved Adobe Acrobat Sign user \`${user.id || ctx.input.userId}\`${user.email ? ` (${user.email})` : ''}.`
    };
  });

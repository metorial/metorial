import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve a Calendly user's profile information. If no userUri is provided, returns the currently authenticated user's profile with their organization URI and scheduling URL.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userUri: z
        .string()
        .optional()
        .describe(
          'URI or UUID of the user to retrieve. Omit to get the current authenticated user.'
        )
    })
  )
  .output(
    z.object({
      userUri: z.string().describe('Unique URI of the user'),
      name: z.string().describe('User display name'),
      email: z.string().describe('User email address'),
      slug: z.string().describe('URL-friendly identifier'),
      schedulingUrl: z.string().describe('User scheduling page URL'),
      timezone: z.string().describe('User timezone'),
      avatarUrl: z.string().nullable().describe('URL of the user avatar image'),
      organizationUri: z.string().describe('URI of the user current organization'),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let user = ctx.input.userUri
      ? await client.getUser(ctx.input.userUri)
      : await client.getCurrentUser();

    return {
      output: {
        userUri: user.uri,
        name: user.name,
        email: user.email,
        slug: user.slug,
        schedulingUrl: user.schedulingUrl,
        timezone: user.timezone,
        avatarUrl: user.avatarUrl,
        organizationUri: user.currentOrganization,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      message: `User **${user.name}** (${user.email}) — Scheduling URL: ${user.schedulingUrl}`
    };
  })
  .build();

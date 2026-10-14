import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { accountIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getCurrentUserTool = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Get the authenticated person’s profile in a Basecamp account. Call list_accounts to discover the accountId.',
  tags: { readOnly: true }
})
  .input(z.object({ accountId: accountIdSchema }))
  .output(
    z.object({
      personId: z.number().describe('ID of the authenticated person'),
      name: z.string().describe('Full name'),
      emailAddress: z.string().nullable().describe('Email address when available'),
      title: z.string().nullable().describe('Job title'),
      company: z.string().nullable().describe('Company name'),
      admin: z.boolean().describe('Whether this person is an account administrator'),
      owner: z.boolean().describe('Whether this person is an account owner'),
      personableType: z.string().nullable().describe('Person type reported by Basecamp'),
      avatarUrl: z.string().nullable().describe('Profile image URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.input.accountId,
      legacyConfig: ctx.config
    });
    let person = await client.getMyProfile();
    return {
      output: {
        personId: person.id,
        name: person.name,
        emailAddress: person.email_address ?? null,
        title: person.title ?? null,
        company: person.company?.name ?? null,
        admin: person.admin ?? false,
        owner: person.owner ?? false,
        personableType: person.personable_type ?? null,
        avatarUrl: person.avatar_url ?? null
      },
      message: `Authenticated as **${person.name}**.`
    };
  })
  .build();

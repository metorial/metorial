import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMembers = SlateTool.create(spec, {
  name: 'List Members',
  key: 'list_members',
  description: `Lists all members of the workspace. Use this to look up member UUIDs for assigning owners, followers, or requested-by fields on stories and epics.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      members: z
        .array(
          z.object({
            memberId: z.string().describe('UUID of the member'),
            name: z.string().describe('Display name'),
            mentionName: z.string().describe('Mention handle (@name)'),
            email: z.string().nullable().describe('Email address'),
            role: z.string().describe('Role in the workspace'),
            disabled: z.boolean().describe('Whether the member account is disabled')
          })
        )
        .describe('List of all workspace members')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let members = await client.listMembers();

    let mapped = members.map((m: any) => ({
      memberId: m.id,
      name: m.profile?.name || m.profile?.mention_name || '',
      mentionName: m.profile?.mention_name || '',
      email: m.profile?.email_address ?? null,
      role: m.role || '',
      disabled: m.disabled ?? false
    }));

    return {
      output: { members: mapped },
      message: `Found **${mapped.length}** workspace members`
    };
  })
  .build();

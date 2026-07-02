import { SlateTool } from 'slates';
import { z } from 'zod';
import { ModeClient } from '../lib/client';
import { getEmbedded, normalizeMember } from '../lib/helpers';
import { spec } from '../spec';

export let listMembers = SlateTool.create(spec, {
  name: 'List Members',
  key: 'list_members',
  description: `List all members of the Mode workspace. Returns each member's username, email, name, admin status, and membership state.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      members: z.array(
        z.object({
          membershipToken: z.string().describe('Unique token of the membership'),
          state: z.string().describe('Membership state'),
          memberUsername: z.string().describe('Username of the member'),
          memberEmail: z.string().describe('Email of the member'),
          memberName: z.string().describe('Display name of the member'),
          admin: z.boolean().describe('Whether the member is an admin'),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ModeClient({
      token: ctx.auth.token,
      secret: ctx.auth.secret,
      workspaceName: ctx.config.workspaceName
    });

    let data = await client.listMembers();
    let members = getEmbedded(data, 'memberships').map(normalizeMember);

    return {
      output: { members },
      message: `Found **${members.length}** workspace members.`
    };
  })
  .build();

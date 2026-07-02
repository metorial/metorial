import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageMemberships = SlateTool.create(spec, {
  name: 'Manage Memberships',
  key: 'manage_memberships',
  description: `Invite members to a Loomio group by email and optionally sync the membership list. Provide a list of email addresses to add. Enable **removeAbsent** to remove existing members whose emails are not in the provided list, effectively syncing the group membership to match the given list.`,
  instructions: [
    'Use **removeAbsent** with caution — it will remove all existing members whose emails are not in the provided list.'
  ],
  constraints: [
    'The removeAbsent option can remove all members if an empty or incomplete email list is provided.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      groupId: z.number().describe('ID of the group to manage memberships for'),
      emails: z.array(z.string()).describe('List of email addresses to invite to the group'),
      removeAbsent: z
        .boolean()
        .default(false)
        .describe(
          'If true, remove existing members whose emails are not in the provided list. Use with caution.'
        )
    })
  )
  .output(
    z.object({
      added: z.array(z.string()).describe('Email addresses that were newly added'),
      removed: z
        .array(z.string())
        .describe('Email addresses that were removed (only when removeAbsent is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    if (ctx.input.removeAbsent) {
      ctx.warn(
        'removeAbsent is enabled — members not in the provided email list will be removed from the group.'
      );
    }

    let result = await client.syncMemberships({
      groupId: ctx.input.groupId,
      emails: ctx.input.emails,
      removeAbsent: ctx.input.removeAbsent
    });

    let added = result.added || [];
    let removed = result.removed || [];

    return {
      output: { added, removed },
      message: `Membership sync complete. **${added.length}** added, **${removed.length}** removed.`
    };
  })
  .build();

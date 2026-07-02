import { SlateTool } from 'slates';
import { z } from 'zod';
import { LastPassClient } from '../lib/client';
import { spec } from '../spec';

export let manageGroupMembership = SlateTool.create(spec, {
  name: 'Manage Group Membership',
  key: 'manage_group_membership',
  description: `Add or remove users from groups in LastPass Enterprise. Supports batch operations to modify group memberships for multiple users at once.`,
  instructions: [
    'Provide a list of membership changes, each specifying a **username** and groups to **add** and/or **remove**.',
    'Each change entry can include both additions and removals simultaneously.'
  ],
  constraints: [
    'Does not support managing groups for pre-configured SSO (Cloud) apps on LastPass Business accounts.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      changes: z
        .array(
          z.object({
            username: z.string().describe('Email address of the user'),
            addToGroups: z
              .array(z.string())
              .optional()
              .describe('Group names to add the user to'),
            removeFromGroups: z
              .array(z.string())
              .optional()
              .describe('Group names to remove the user from')
          })
        )
        .min(1)
        .describe('List of group membership changes')
    })
  )
  .output(
    z.object({
      status: z.string().describe('API response status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LastPassClient({
      companyId: ctx.auth.companyId,
      provisioningHash: ctx.auth.provisioningHash
    });

    let batchData = ctx.input.changes.map(change => ({
      username: change.username,
      add: change.addToGroups,
      del: change.removeFromGroups
    }));

    let result = await client.batchChangeGroup(batchData);

    let userCount = ctx.input.changes.length;

    return {
      output: {
        status: result.status || 'OK'
      },
      message: `Updated group membership for **${userCount}** user(s).`
    };
  })
  .build();

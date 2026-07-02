import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirefliesClient } from '../lib/client';
import { spec } from '../spec';
import { mapUserGroup, userGroupSchema } from './shared';

export let listUserGroups = SlateTool.create(spec, {
  name: 'List User Groups',
  key: 'list_user_groups',
  description: `Retrieve Fireflies user groups in the workspace, including group handles and members. Optionally return only groups the authenticated user belongs to.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mine: z
        .boolean()
        .optional()
        .describe('If true, only return groups the authenticated user belongs to')
    })
  )
  .output(
    z.object({
      userGroups: z.array(userGroupSchema).describe('User groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirefliesClient({ token: ctx.auth.token });
    let groups = await client.getUserGroups({ mine: ctx.input.mine });
    let mapped = (groups || []).map((group: any) => mapUserGroup(group));

    return {
      output: { userGroups: mapped },
      message: `Found **${mapped.length}** user group(s).`
    };
  })
  .build();

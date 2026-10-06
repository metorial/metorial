import { SlateTool } from 'slates';
import { z } from 'zod';
import { OneLoginClient } from '../lib/client';
import { spec } from '../spec';

const member = z.object({
  userId: z.number(),
  email: z.string().nullish(),
  firstname: z.string().nullish(),
  lastname: z.string().nullish()
});
export const getGroup = SlateTool.create(spec, {
  name: 'Get Group',
  key: 'get_group',
  description:
    'Read one exact OneLogin group with its native policy, users and administrators. Requires Read All or Manage All API credentials; the API account is not a person identity.',
  tags: { readOnly: true }
})
  .input(z.object({ groupId: z.number().describe('Exact group ID from List Groups') }))
  .output(
    z.object({
      groupId: z.number(),
      name: z.string(),
      policy: z.object({ policyId: z.number(), name: z.string() }).nullable(),
      users: z.array(member),
      admins: z.array(member)
    })
  )
  .handleInvocation(async ctx => {
    const group = await OneLoginClient.fromContext(ctx).getGroup(ctx.input.groupId);
    const mapMember = (item: (typeof group.users)[number]) => ({
      userId: item.id,
      email: item.email,
      firstname: item.first_name,
      lastname: item.last_name
    });
    return {
      output: {
        groupId: group.id,
        name: group.name,
        policy:
          group.policy === null
            ? null
            : { policyId: group.policy.id, name: group.policy.name },
        users: group.users.map(mapMember),
        admins: group.admins.map(mapMember)
      },
      message: `Retrieved group ${group.id}.`
    };
  });

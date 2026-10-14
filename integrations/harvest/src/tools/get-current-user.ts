import { SlateTool } from 'slates';
import { z } from 'zod';
import { harvestAccountIdSchema, resolveHarvestAccountId } from '../lib/account-id';
import { HarvestClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the currently authenticated user in a Harvest account, including their profile and access roles. Call list_accounts to discover account IDs when choosing between multiple accounts.',
  tags: { readOnly: true }
})
  .input(z.object({ accountId: harvestAccountIdSchema }))
  .output(
    z.object({
      accountId: z.string().describe('Harvest account ID'),
      userId: z.number().describe('Harvest user ID'),
      firstName: z.string(),
      lastName: z.string(),
      email: z.string(),
      timezone: z.string(),
      isActive: z.boolean(),
      isContractor: z.boolean(),
      roles: z.array(z.string()).describe('Business role names'),
      accessRoles: z.array(z.string()).describe('Permission roles'),
      permissionsProfile: z
        .string()
        .optional()
        .describe('Permission profile name, when returned'),
      avatarUrl: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let accountId = resolveHarvestAccountId(ctx);
    let client = new HarvestClient({ token: ctx.auth.token, accountId });
    let user = await client.getCurrentUser();
    return {
      output: {
        accountId,
        userId: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        timezone: user.timezone,
        isActive: user.is_active,
        isContractor: user.is_contractor,
        roles: user.roles ?? [],
        accessRoles: user.access_roles ?? [],
        permissionsProfile: user.permissions_profile,
        avatarUrl: user.avatar_url
      },
      message: `Authenticated as **${user.first_name} ${user.last_name}** in account **${accountId}**.`
    };
  })
  .build();

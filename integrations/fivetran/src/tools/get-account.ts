import { SlateTool } from 'slates';
import { z } from 'zod';
import { FivetranClient } from '../lib/client';
import { spec } from '../spec';

export const getAccount = SlateTool.create(spec, {
  key: 'get_account',
  name: 'Get Account',
  description:
    'Identify the account and user or system key associated with the current API credentials.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.string(),
      accountName: z.string().optional(),
      userId: z.string().optional(),
      systemKeyId: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const current = await new FivetranClient(ctx.auth.token).getAccount();
    return {
      output: {
        accountId: current.account_id,
        accountName: current.account_name,
        userId: current.user_id,
        systemKeyId: current.system_key_id
      },
      message: 'Retrieved the account associated with the API key.'
    };
  })
  .build();

export const listRoles = SlateTool.create(spec, {
  key: 'list_roles',
  name: 'List Roles',
  description:
    'Discover current account, destination, connection and team role names before assigning user or team permissions.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      roles: z.array(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          scope: z.array(z.string()),
          isCustom: z.boolean(),
          isDeprecated: z.boolean(),
          replacementRoleName: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const items = await new FivetranClient(ctx.auth.token).listRoles();
    return {
      output: {
        roles: items.map(role => ({
          name: role.name,
          description: role.description,
          scope: role.scope,
          isCustom: role.is_custom,
          isDeprecated: role.is_deprecated,
          replacementRoleName: role.replacement_role_name
        }))
      },
      message: `Found ${items.length} roles.`
    };
  })
  .build();

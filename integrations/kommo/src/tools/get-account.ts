import { SlateTool } from 'slates';
import { z } from 'zod';
import { KommoClient } from '../lib/client';
import { spec } from '../spec';

export let getAccountTool = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Get Kommo account information including account name, subdomain, current user, currency, and configured task types and user groups.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      accountId: z.number().describe('Account ID'),
      name: z.string().describe('Account name'),
      subdomain: z.string().describe('Account subdomain'),
      currentUserId: z.number().describe('Current authenticated user ID'),
      country: z.string().optional().describe('Account country code'),
      currency: z.string().optional().describe('Account currency code'),
      currencySymbol: z.string().optional().describe('Currency symbol'),
      isLossReasonEnabled: z.boolean().optional().describe('Whether loss reasons are enabled'),
      taskTypes: z
        .array(
          z.object({
            taskTypeId: z.number().describe('Task type ID'),
            name: z.string().describe('Task type name'),
            code: z.string().optional().describe('Task type code')
          })
        )
        .optional()
        .describe('Available task types'),
      userGroups: z
        .array(
          z.object({
            groupId: z.number().describe('Group ID'),
            name: z.string().describe('Group name')
          })
        )
        .optional()
        .describe('User groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KommoClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let account = await client.getAccount();

    return {
      output: {
        accountId: account.id,
        name: account.name,
        subdomain: account.subdomain,
        currentUserId: account.current_user_id,
        country: account.country,
        currency: account.currency,
        currencySymbol: account.currency_symbol,
        isLossReasonEnabled: account.is_loss_reason_enabled,
        taskTypes: account._embedded?.task_types?.map((t: any) => ({
          taskTypeId: t.id,
          name: t.name,
          code: t.code
        })),
        userGroups: account._embedded?.users_groups?.map((g: any) => ({
          groupId: g.id,
          name: g.name
        }))
      },
      message: `Account **${account.name}** (${account.subdomain}.kommo.com).`
    };
  })
  .build();

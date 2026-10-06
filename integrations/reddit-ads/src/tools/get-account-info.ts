import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { accountInput, id, optionalText } from '../lib/contracts';
import { spec } from '../spec';

export let getAccountInfo = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account_info',
  description:
    'Read the authenticated actor and exact ad account identity, currency, approval state and optional funding instruments. Use list_ad_accounts to discover account IDs.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: accountInput,
      includeFunding: z
        .boolean()
        .optional()
        .describe(
          'Include one page of funding instruments; billing access errors are reported, not converted into an empty list.'
        )
    })
  )
  .output(
    z.object({
      actor: z.record(z.string(), z.unknown()),
      businessId: z.string().optional(),
      adminApproval: z.string().optional(),
      fundingNextUrl: z.string().optional(),
      fundingHasMore: z.boolean().optional(),
      accountId: z.string().optional(),
      name: z.string().optional(),
      status: z.string().optional(),
      currency: z.string().optional(),
      fundingInstruments: z.array(z.any()).optional(),
      raw: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const actor = await client.getMe();
    const account = await client.getAccount();
    const funding = ctx.input.includeFunding === false ? undefined : await client.funds({});
    return {
      output: {
        accountId: id(account.id),
        name: optionalText(account.name),
        status: optionalText(account.status),
        currency: optionalText(account.currency),
        fundingInstruments: funding?.items,
        fundingNextUrl: funding?.nextUrl,
        fundingHasMore: funding?.hasMore,
        actor,
        businessId: optionalText(account.business_id),
        adminApproval: optionalText(account.admin_approval),
        raw: account
      },
      message:
        'Retrieved authenticated actor and exact account details. Approval state is distinct from campaign delivery state.'
    };
  })
  .build();

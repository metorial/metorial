import { SlateTool } from 'slates';
import { z } from 'zod';
import { RedditAdsClient } from '../lib/client';
import { id, pagingInput, pagingOutput, text, unexpected } from '../lib/contracts';
import { spec } from '../spec';
export const listAdAccounts = SlateTool.create(spec, {
  key: 'list_ad_accounts',
  name: 'List Ad Accounts',
  description:
    'Discover authenticated actor and businesses, then supply businessId to query that business’s ad accounts. Returns one page; no account is selected automatically.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      businessId: z
        .string()
        .optional()
        .describe(
          'Omit to list accessible businesses. Provide an exact returned business ID to list its accounts.'
        ),
      ...pagingInput
    })
  )
  .output(
    z.object({
      actor: z.record(z.string(), z.unknown()),
      businesses: z.array(z.record(z.string(), z.unknown())).optional(),
      accounts: z.array(z.record(z.string(), z.unknown())).optional(),
      ...pagingOutput
    })
  )
  .handleInvocation(async ctx => {
    const client = new RedditAdsClient(ctx.auth);
    const actor = await client.getMe();
    const page =
      ctx.input.businessId === undefined
        ? await client.businesses(ctx.input)
        : await client.accounts(ctx.input.businessId, ctx.input);
    for (const item of page.items) {
      id(item.id);
      text(item.name, 'Provider name');
      if (ctx.input.businessId !== undefined && item.business_id !== ctx.input.businessId)
        unexpected();
    }
    return {
      output: {
        actor,
        ...(ctx.input.businessId === undefined
          ? { businesses: page.items }
          : { accounts: page.items }),
        nextUrl: page.nextUrl,
        hasMore: page.hasMore
      },
      message:
        ctx.input.businessId === undefined
          ? 'Retrieved one page of businesses. Select a businessId to discover its accounts.'
          : 'Retrieved one page of ad accounts for the selected business.'
    };
  })
  .build();

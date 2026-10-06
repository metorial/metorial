import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { accountIdField } from '../lib/schemas';
import { spec } from '../spec';

export const getCurrentUser = SlateTool.create(spec, {
  key: 'get_current_user',
  name: 'Get Current User',
  description:
    'Read the connected LinkedIn member identity using OpenID Connect. Does not enumerate advertising account permissions.',
  tags: { readOnly: true, destructive: false }
})
  .scopes(anyOf('openid'))
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string(),
      name: z.string().optional(),
      givenName: z.string().optional(),
      familyName: z.string().optional(),
      pictureUrl: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const user = await new Client(ctx.auth).getCurrentUser();
    return {
      output: {
        userId: user.sub,
        name: user.name,
        givenName: user.given_name,
        familyName: user.family_name,
        pictureUrl: user.picture
      },
      message: 'Retrieved the connected LinkedIn member.'
    };
  })
  .build();

export const getCampaignGroup = SlateTool.create(spec, {
  key: 'get_campaign_group',
  name: 'Get Campaign Group',
  description:
    'Retrieve one campaign group in an authorized ad account. Call list_ad_accounts and list_campaign_groups to discover its IDs.',
  tags: { readOnly: true, destructive: false }
})
  .scopes(anyOf('r_ads', 'rw_ads'))
  .input(z.object({ accountId: accountIdField, campaignGroupId: z.string() }))
  .output(
    z.object({
      campaignGroupId: z.number(),
      name: z.string(),
      account: z.string(),
      status: z.string(),
      test: z.boolean().optional(),
      totalBudget: z.object({ amount: z.string(), currencyCode: z.string() }).optional(),
      runSchedule: z
        .object({ start: z.number().optional(), end: z.number().optional() })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    const group = await new Client(ctx.auth).getCampaignGroup(
      ctx.input.campaignGroupId,
      ctx.input.accountId
    );
    return {
      output: {
        campaignGroupId: group.id,
        name: group.name,
        account: group.account,
        status: group.status,
        test: group.test,
        totalBudget: group.totalBudget,
        runSchedule: group.runSchedule
      },
      message: 'Retrieved the campaign group.'
    };
  })
  .build();

export const getCreative = SlateTool.create(spec, {
  key: 'get_creative',
  name: 'Get Creative',
  description:
    'Retrieve one creative in an authorized ad account. Call list_ad_accounts and list_creatives to discover its IDs.',
  tags: { readOnly: true, destructive: false }
})
  .scopes(anyOf('r_ads', 'rw_ads'))
  .input(z.object({ accountId: accountIdField, creativeId: z.string() }))
  .output(
    z.object({
      creativeId: z.string(),
      campaign: z.string(),
      account: z.string(),
      intendedStatus: z.string(),
      content: z.any().optional(),
      isServing: z.boolean().optional(),
      name: z.string().optional(),
      servingHoldReasons: z.array(z.string()).optional()
    })
  )
  .handleInvocation(async ctx => {
    const creative = await new Client(ctx.auth).getCreative(
      ctx.input.creativeId,
      ctx.input.accountId
    );
    return {
      output: {
        creativeId: creative.id,
        campaign: creative.campaign,
        account: creative.account,
        intendedStatus: creative.intendedStatus,
        content: creative.content,
        isServing: creative.isServing,
        name: creative.name,
        servingHoldReasons: creative.servingHoldReasons
      },
      message: 'Retrieved the creative.'
    };
  })
  .build();

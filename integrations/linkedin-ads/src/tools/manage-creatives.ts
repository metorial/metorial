import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, continuation, urn } from '../lib/client';
import { accountIdField } from '../lib/schemas';
import { spec } from '../spec';

export let listCreatives = SlateTool.create(spec, {
  name: 'List Creatives',
  key: 'list_creatives',
  description: `List ad creatives for a specific LinkedIn campaign. Returns creative details including status, content, and serving information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(anyOf('r_ads', 'rw_ads'))
  .input(
    z.object({
      campaignId: z.string().describe('Numeric ID of the campaign'),
      accountId: accountIdField
        .optional()
        .describe(
          'Authorized account ID from list_ad_accounts. Omit only for bounded, unambiguous read-only account discovery.'
        ),
      pageSize: z.number().optional().describe('Number of results per page, from 1 to 100'),
      pageToken: z.string().optional().describe('Page token for pagination')
    })
  )
  .output(
    z.object({
      nextPageToken: z
        .string()
        .optional()
        .describe('Continuation token for pageToken with the same filters'),
      creatives: z.array(
        z.object({
          creativeId: z.string().describe('ID of the creative (URN format)'),
          campaign: z.string().describe('Campaign URN'),
          account: z.string().describe('Account URN'),
          intendedStatus: z.string().describe('Intended status (ACTIVE, PAUSED, ARCHIVED)'),
          content: z.any().optional().describe('Creative content configuration'),
          servingStatuses: z.array(z.string()).optional().describe('Current serving statuses'),
          isTest: z.boolean().optional().describe('Test flag derived from the parent account')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCreatives(ctx.input.campaignId, {
      accountId: ctx.input.accountId,
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let creatives = result.elements.map(creative => ({
      creativeId: creative.id,
      campaign: creative.campaign,
      account: creative.account,
      intendedStatus: creative.intendedStatus,
      content: creative.content,
      servingStatuses: creative.servingStatuses,
      isTest: creative.isTest
    }));

    return {
      output: { creatives, nextPageToken: continuation(result) },
      message: `Found **${creatives.length}** creative(s) for campaign ${ctx.input.campaignId}.`
    };
  })
  .build();

export let createCreative = SlateTool.create(spec, {
  name: 'Create Creative',
  key: 'create_creative',
  description: `Create a new ad creative for a LinkedIn campaign. A creative connects an ad content (post, image, etc.) to a campaign and determines how it is displayed.`,
  instructions: [
    'The campaign URN must be in the format "urn:li:sponsoredCampaign:123456".',
    'Content structure depends on the creative type and campaign format.',
    'For Sponsored Content, provide a reference to an existing post; inline post creation is a separate API operation.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(anyOf('rw_ads'))
  .input(
    z.object({
      campaignId: z.string().describe('Numeric ID of the campaign'),
      accountId: accountIdField
        .optional()
        .describe(
          'Authorized account ID from list_ad_accounts. Omit only for bounded, unambiguous read-only account discovery.'
        ),
      intendedStatus: z
        .enum(['ACTIVE', 'PAUSED', 'ARCHIVED', 'DRAFT'])
        .default('ACTIVE')
        .describe('Intended status of the creative'),
      name: z.string().optional().describe('Name for this creative'),
      content: z
        .any()
        .describe('Creative content configuration (format depends on campaign type)'),
      isTest: z.boolean().optional().describe('Test flag derived from the parent account')
    })
  )
  .output(
    z.object({
      creativeId: z.string().describe('ID of the created creative')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, unknown> = {
      campaign: urn(ctx.input.campaignId, 'sponsoredCampaign'),
      intendedStatus: ctx.input.intendedStatus,
      content: ctx.input.content,
      name: ctx.input.name
    };

    if (ctx.input.isTest !== undefined) {
      data.isTest = ctx.input.isTest;
    }

    let creativeId = await client.createCreative(data, ctx.input.accountId);

    return {
      output: { creativeId },
      message: 'LinkedIn confirmed the requested operation.'
    };
  })
  .build();

export let updateCreative = SlateTool.create(spec, {
  name: 'Update Creative',
  key: 'update_creative',
  description: `Update an existing ad creative's status or name. Commonly used to activate, pause, or archive creatives.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(anyOf('rw_ads'))
  .input(
    z.object({
      creativeId: z.string().describe('ID of the creative to update (URN format)'),
      accountId: accountIdField
        .optional()
        .describe(
          'Authorized account ID from list_ad_accounts. Omit only for bounded, unambiguous read-only account discovery.'
        ),
      intendedStatus: z
        .enum(['ACTIVE', 'PAUSED', 'ARCHIVED', 'DRAFT'])
        .optional()
        .describe('New intended status'),
      name: z.string().optional().describe('New creative name'),
      content: z
        .any()
        .optional()
        .describe(
          'Legacy content input. Current API cannot replace content references; create a new creative instead'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let patch: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) patch.name = ctx.input.name;
    if (ctx.input.intendedStatus) patch.intendedStatus = ctx.input.intendedStatus;
    if (ctx.input.content !== undefined) patch.content = ctx.input.content;

    await client.updateCreative(ctx.input.creativeId, { patch }, ctx.input.accountId);

    return {
      output: { success: true },
      message: 'LinkedIn confirmed the requested operation.'
    };
  })
  .build();

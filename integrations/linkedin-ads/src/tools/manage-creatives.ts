import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
  .input(
    z.object({
      campaignId: z.string().describe('Numeric ID of the campaign'),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageToken: z.string().optional().describe('Page token for pagination')
    })
  )
  .output(
    z.object({
      creatives: z.array(
        z.object({
          creativeId: z.string().describe('ID of the creative (URN format)'),
          campaign: z.string().describe('Campaign URN'),
          account: z.string().describe('Account URN'),
          intendedStatus: z.string().describe('Intended status (ACTIVE, PAUSED, ARCHIVED)'),
          content: z.any().optional().describe('Creative content configuration'),
          servingStatuses: z.array(z.string()).optional().describe('Current serving statuses'),
          isTest: z.boolean().optional().describe('Whether this is a test creative')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCreatives(ctx.input.campaignId, {
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
      output: { creatives },
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
    'For sponsored content, provide a reference to an existing post or inline content.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('Numeric ID of the campaign'),
      intendedStatus: z
        .enum(['ACTIVE', 'PAUSED', 'ARCHIVED'])
        .default('ACTIVE')
        .describe('Intended status of the creative'),
      content: z
        .any()
        .describe('Creative content configuration (format depends on campaign type)'),
      isTest: z.boolean().optional().describe('Whether this is a test creative')
    })
  )
  .output(
    z.object({
      creativeId: z.string().describe('ID of the created creative')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, any> = {
      campaign: `urn:li:sponsoredCampaign:${ctx.input.campaignId}`,
      intendedStatus: ctx.input.intendedStatus,
      content: ctx.input.content
    };

    if (ctx.input.isTest !== undefined) {
      data.isTest = ctx.input.isTest;
    }

    let creativeId = await client.createCreative(data);

    return {
      output: { creativeId },
      message: `Created creative with ID **${creativeId}**.`
    };
  })
  .build();

export let updateCreative = SlateTool.create(spec, {
  name: 'Update Creative',
  key: 'update_creative',
  description: `Update an existing ad creative's status or content. Commonly used to activate, pause, or archive creatives.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      creativeId: z.string().describe('ID of the creative to update (URN format)'),
      intendedStatus: z
        .enum(['ACTIVE', 'PAUSED', 'ARCHIVED'])
        .optional()
        .describe('New intended status'),
      content: z.any().optional().describe('New content configuration')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let patch: Record<string, any> = {};
    if (ctx.input.intendedStatus) patch.intendedStatus = ctx.input.intendedStatus;
    if (ctx.input.content) patch.content = ctx.input.content;

    await client.updateCreative(ctx.input.creativeId, { patch });

    return {
      output: { success: true },
      message: `Updated creative **${ctx.input.creativeId}** successfully.`
    };
  })
  .build();

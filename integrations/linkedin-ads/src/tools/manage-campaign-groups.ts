import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCampaignGroups = SlateTool.create(spec, {
  name: 'List Campaign Groups',
  key: 'list_campaign_groups',
  description: `List campaign groups for a LinkedIn ad account. Campaign groups are the top-level organizational unit for campaigns.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z.string().describe('Numeric ID of the ad account'),
      pageSize: z.number().optional().describe('Number of results per page'),
      pageToken: z.string().optional().describe('Page token for pagination')
    })
  )
  .output(
    z.object({
      campaignGroups: z.array(
        z.object({
          campaignGroupId: z.number().describe('Numeric ID of the campaign group'),
          name: z.string().describe('Name of the campaign group'),
          account: z.string().describe('Account URN'),
          status: z.string().describe('Campaign group status'),
          totalBudget: z
            .object({
              amount: z.string(),
              currencyCode: z.string()
            })
            .optional()
            .describe('Total budget for the group'),
          runSchedule: z
            .object({
              start: z.number().optional(),
              end: z.number().optional()
            })
            .optional()
            .describe('Scheduled run dates (epoch ms)')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCampaignGroups(ctx.input.accountId, {
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let campaignGroups = result.elements.map(group => ({
      campaignGroupId: group.id,
      name: group.name,
      account: group.account,
      status: group.status,
      totalBudget: group.totalBudget,
      runSchedule: group.runSchedule
    }));

    return {
      output: { campaignGroups },
      message: `Found **${campaignGroups.length}** campaign group(s).`
    };
  })
  .build();

export let createCampaignGroup = SlateTool.create(spec, {
  name: 'Create Campaign Group',
  key: 'create_campaign_group',
  description: `Create a new campaign group in a LinkedIn ad account. Campaign groups serve as containers for related campaigns and allow setting shared budget and schedule constraints.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      accountId: z.string().describe('Numeric ID of the ad account'),
      name: z.string().describe('Name for the campaign group'),
      status: z
        .enum(['ACTIVE', 'PAUSED', 'ARCHIVED', 'DRAFT'])
        .describe('Initial status of the campaign group'),
      totalBudget: z
        .object({
          amount: z.string().describe('Budget amount as string (e.g., "1000.00")'),
          currencyCode: z.string().describe('ISO currency code (e.g., "USD")')
        })
        .optional()
        .describe('Total budget for the campaign group'),
      runScheduleStart: z.number().optional().describe('Start date as epoch milliseconds'),
      runScheduleEnd: z.number().optional().describe('End date as epoch milliseconds')
    })
  )
  .output(
    z.object({
      campaignGroupId: z.string().describe('ID of the created campaign group')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data: Record<string, any> = {
      account: `urn:li:sponsoredAccount:${ctx.input.accountId}`,
      name: ctx.input.name,
      status: ctx.input.status
    };

    if (ctx.input.totalBudget) {
      data.totalBudget = ctx.input.totalBudget;
    }

    if (ctx.input.runScheduleStart || ctx.input.runScheduleEnd) {
      data.runSchedule = {};
      if (ctx.input.runScheduleStart) data.runSchedule.start = ctx.input.runScheduleStart;
      if (ctx.input.runScheduleEnd) data.runSchedule.end = ctx.input.runScheduleEnd;
    }

    let campaignGroupId = await client.createCampaignGroup(data as any);

    return {
      output: { campaignGroupId },
      message: `Created campaign group **${ctx.input.name}** with ID **${campaignGroupId}**.`
    };
  })
  .build();

export let updateCampaignGroup = SlateTool.create(spec, {
  name: 'Update Campaign Group',
  key: 'update_campaign_group',
  description: `Update an existing campaign group's name, status, budget, or schedule.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignGroupId: z.string().describe('Numeric ID of the campaign group to update'),
      name: z.string().optional().describe('New name for the campaign group'),
      status: z
        .enum(['ACTIVE', 'PAUSED', 'ARCHIVED', 'DRAFT'])
        .optional()
        .describe('New status'),
      totalBudget: z
        .object({
          amount: z.string(),
          currencyCode: z.string()
        })
        .optional()
        .describe('New total budget'),
      runScheduleStart: z.number().optional().describe('New start date as epoch milliseconds'),
      runScheduleEnd: z.number().optional().describe('New end date as epoch milliseconds')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let updates: Record<string, any> = {};
    if (ctx.input.name) updates.patch = { ...updates.patch, name: ctx.input.name };
    if (ctx.input.status) updates.patch = { ...updates.patch, status: ctx.input.status };
    if (ctx.input.totalBudget)
      updates.patch = { ...updates.patch, totalBudget: ctx.input.totalBudget };
    if (ctx.input.runScheduleStart || ctx.input.runScheduleEnd) {
      let runSchedule: Record<string, any> = {};
      if (ctx.input.runScheduleStart) runSchedule.start = ctx.input.runScheduleStart;
      if (ctx.input.runScheduleEnd) runSchedule.end = ctx.input.runScheduleEnd;
      updates.patch = { ...updates.patch, runSchedule };
    }

    await client.updateCampaignGroup(ctx.input.campaignGroupId, updates);

    return {
      output: { success: true },
      message: `Updated campaign group **${ctx.input.campaignGroupId}** successfully.`
    };
  })
  .build();

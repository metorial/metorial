import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listReportingGroupsTool = SlateTool.create(spec, {
  name: 'List Reporting Groups',
  key: 'list_reporting_groups',
  description: `Retrieve reporting groups for your Later Influence community. Reporting groups allow you to aggregate data across related campaigns. Optionally filter by reporting group ID or campaign ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reportingGroupId: z
        .string()
        .optional()
        .describe('Filter by a specific reporting group ID'),
      campaignId: z
        .string()
        .optional()
        .describe('Filter reporting groups associated with a specific campaign')
    })
  )
  .output(
    z.object({
      reportingGroups: z
        .array(
          z
            .object({
              reportingGroupId: z
                .string()
                .describe('Unique identifier of the reporting group'),
              name: z.string().describe('Name of the reporting group'),
              campaignIds: z
                .array(z.string())
                .describe('List of campaign IDs in this reporting group')
            })
            .passthrough()
        )
        .describe('List of reporting groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let groups = await client.getReportingGroups({
      reportingGroupId: ctx.input.reportingGroupId,
      campaignId: ctx.input.campaignId
    });

    let groupList = Array.isArray(groups) ? groups : [groups];

    return {
      output: {
        reportingGroups: groupList as any
      },
      message: ctx.input.reportingGroupId
        ? `Retrieved reporting group **${ctx.input.reportingGroupId}**.`
        : `Retrieved **${groupList.length}** reporting group(s).`
    };
  })
  .build();

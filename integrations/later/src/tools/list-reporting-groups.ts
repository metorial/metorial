import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listReportingGroupsTool = SlateTool.create(spec, {
  name: 'List Reporting Groups',
  key: 'list_reporting_groups',
  description:
    'List reporting groups using legacy Reporting API v1 credentials. Reporting API v2 has no direct equivalent; this tool cannot use a v2 connection.',
  instructions: [
    'Requires the Legacy Reporting API v1 authentication method. No reporting-group to campaign mapping is assumed.'
  ],
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
    let client = new Client(ctx.auth);
    let groups = await client.getReportingGroups({
      reportingGroupId: ctx.input.reportingGroupId,
      campaignId: ctx.input.campaignId
    });

    let groupList = Array.isArray(groups) ? groups : [groups];

    return {
      output: {
        reportingGroups: groupList
      },
      message: `Retrieved ${groupList.length} legacy reporting group(s).`
    };
  })
  .build();

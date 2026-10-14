import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateIssueTool = SlateTool.create(spec, {
  name: 'Update Issue',
  key: 'update_issue',
  description: `Update an existing issue in Leiga. Modify any fields such as summary, description, priority, status, assignee, dates, story points, and custom fields.`,
  instructions: [
    'Only include fields you want to change in the `fields` parameter. Call get_issue_schema to discover valid field codes and option IDs.'
  ]
})
  .input(
    z.object({
      issueId: z.number().describe('The ID of the issue to update'),
      fields: z
        .record(z.string(), z.any())
        .describe(
          'Fields to update using codes from get_issue_schema, such as summary, description, priority, status, assignee, owner, estimatePoint, sprint, epic, label, and custom fields.'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update succeeded'),
      raw: z.any().optional().describe('Full response data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.updateIssue({
      issueId: ctx.input.issueId,
      data: ctx.input.fields
    });

    return {
      output: {
        success: true,
        raw: response.data
      },
      message: `Updated issue **#${ctx.input.issueId}**.`
    };
  })
  .build();

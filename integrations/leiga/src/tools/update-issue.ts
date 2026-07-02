import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateIssueTool = SlateTool.create(spec, {
  name: 'Update Issue',
  key: 'update_issue',
  description: `Update an existing issue in Leiga. Modify any fields such as summary, description, priority, status, assignee, dates, story points, and custom fields.`,
  instructions: ['Only include fields you want to change in the `fields` parameter.']
})
  .input(
    z.object({
      issueId: z.number().describe('The ID of the issue to update'),
      fields: z
        .record(z.string(), z.any())
        .describe(
          'Fields to update. May include summary, description, priority, status, assignee, owner, startDate, dueDate, storyPoint, sprint, epic, labels, and custom fields.'
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

    if (response.code !== '0') {
      throw new Error(response.msg || 'Failed to update issue');
    }

    return {
      output: {
        success: true,
        raw: response.data
      },
      message: `Updated issue **#${ctx.input.issueId}**.`
    };
  })
  .build();

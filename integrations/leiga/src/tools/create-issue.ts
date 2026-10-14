import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createIssueTool = SlateTool.create(spec, {
  name: 'Create Issue',
  key: 'create_issue',
  description: `Create a new issue (work item) in a Leiga project. Requires the project ID and issue type ID. Supports setting summary, description, priority, status, assignee, and other fields through the fields parameter.`,
  instructions: [
    'Use the **List Projects** tool to find the project ID.',
    'Use the **List Issue Types** tool to find valid issue type IDs for the project.',
    'Call get_issue_schema to discover field codes, required fields, and valid option IDs before creating an issue.'
  ]
})
  .input(
    z.object({
      projectId: projectIdSchema,
      issueTypeId: z.number().describe('The issue type ID (e.g. Bug, Task, Story)'),
      fields: z
        .record(z.string(), z.any())
        .describe(
          'Issue field values using codes from get_issue_schema. Common codes include summary, description, priority, status, assignee, owner, estimatePoint, sprint, epic, and label. Selection fields use numeric option IDs.'
        )
    })
  )
  .output(
    z.object({
      issueId: z.number().describe('ID of the created issue'),
      raw: z.any().optional().describe('Full response data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    if (typeof ctx.input.fields.summary !== 'string' || !ctx.input.fields.summary.trim()) {
      throw createApiServiceError('fields.summary must be a nonempty issue title.', {
        reason: 'missing_issue_summary'
      });
    }

    let response = await client.createIssue({
      projectId: ctx.input.projectId,
      issueTypeId: ctx.input.issueTypeId,
      data: ctx.input.fields
    });

    let issueId = response.data?.id;
    if (typeof issueId !== 'number') {
      throw createApiServiceError('Leiga did not return the created issue ID.', {
        reason: 'invalid_issue_response'
      });
    }

    return {
      output: {
        issueId,
        raw: response.data
      },
      message: `Created issue **#${issueId}** in project ${ctx.input.projectId}.`
    };
  })
  .build();

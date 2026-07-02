import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createIssueTool = SlateTool.create(spec, {
  name: 'Create Issue',
  key: 'create_issue',
  description: `Create a new issue (work item) in a Leiga project. Requires the project ID and issue type ID. Supports setting summary, description, priority, status, assignee, and other fields through the fields parameter.`,
  instructions: [
    'Use the **List Projects** tool to find the project ID.',
    'Use the **List Issue Types** tool to find valid issue type IDs for the project.',
    "The `fields` object accepts dynamic key-value pairs matching the project's issue schema (e.g. summary, description, priority, status, assignee, etc.)."
  ]
})
  .input(
    z.object({
      projectId: z.number().describe('The project ID to create the issue in'),
      issueTypeId: z.number().describe('The issue type ID (e.g. Bug, Task, Story)'),
      fields: z
        .record(z.string(), z.any())
        .describe(
          'Issue field values. Must include "summary". May include description, priority, status, assignee, owner, startDate, dueDate, storyPoint, sprint, epic, labels, and custom fields.'
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

    let response = await client.createIssue({
      projectId: ctx.input.projectId,
      issueTypeId: ctx.input.issueTypeId,
      data: ctx.input.fields
    });

    if (response.code !== '0') {
      throw new Error(response.msg || 'Failed to create issue');
    }

    let issueId = response.data?.id;

    return {
      output: {
        issueId,
        raw: response.data
      },
      message: `Created issue **#${issueId}** in project ${ctx.input.projectId}.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getIssueSchemaTool = SlateTool.create(spec, {
  name: 'Get Issue Schema',
  key: 'get_issue_schema',
  description:
    'Discover issue field codes, required fields, and valid option IDs for create_issue and update_issue. Call list_projects and list_issue_types to discover project and issue type IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      projectId: projectIdSchema,
      issueTypeId: z.number().describe('Issue type ID from list_issue_types')
    })
  )
  .output(
    z.object({
      projectId: z.number(),
      issueTypeId: z.number(),
      fields: z
        .array(z.any())
        .describe('Issue field definitions, including option values and requiredFlag')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.getIssueSchema(ctx.input.projectId, ctx.input.issueTypeId);
    let fields = response.data?.fields ?? [];
    return {
      output: { projectId: ctx.input.projectId, issueTypeId: ctx.input.issueTypeId, fields },
      message: `Found ${fields.length} issue field definitions.`
    };
  })
  .build();

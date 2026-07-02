import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listIssueTypesTool = SlateTool.create(spec, {
  name: 'List Issue Types',
  key: 'list_issue_types',
  description: `List available issue types for a project (e.g. Bug, Task, Story, Epic). Use this to get valid issue type IDs when creating issues.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('The project ID to get issue types for')
    })
  )
  .output(
    z.object({
      issueTypes: z.array(
        z.object({
          issueTypeId: z.number().describe('Issue type ID'),
          name: z.string().describe('Issue type name')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let response = await client.getIssueTypeList(ctx.input.projectId);

    let issueTypes = (response.data || []).map((t: any) => ({
      issueTypeId: t.id,
      name: t.name
    }));

    return {
      output: { issueTypes },
      message: `Found **${issueTypes.length}** issue type(s): ${issueTypes.map((t: any) => t.name).join(', ')}.`
    };
  })
  .build();

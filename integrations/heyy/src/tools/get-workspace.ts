import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let workspaceSchema = z.object({
  id: z.string().describe('Workspace ID associated with the API key'),
  name: z.string().describe('Workspace name'),
  timezone: z.string().describe('Workspace timezone'),
  availability: z.array(
    z.object({
      type: z.enum(['week_day', 'date']),
      date: z.string().nullable(),
      weekDay: z
        .enum(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'])
        .nullable(),
      intervals: z.array(z.object({ from: z.string(), to: z.string() }))
    })
  ),
  createdAt: z.string().describe('When the workspace was created'),
  updatedAt: z.string().describe('When the workspace was last updated')
});

export let getWorkspaceTool = SlateTool.create(spec, {
  name: 'Get Current Workspace',
  key: 'get_workspace',
  description:
    'Retrieve the workspace associated with your API key using Heyy API v3. Returns its ID, name, timezone, and availability schedule.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(workspaceSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, version: 'v3' });
    let result = workspaceSchema.safeParse(await client.getWorkspace());
    if (!result.success) {
      throw createApiServiceError('Heyy returned an invalid workspace response.', {
        reason: 'heyy_invalid_response'
      });
    }
    return {
      output: result.data,
      message: `Retrieved workspace **${result.data.name}** (${result.data.id}).`
    };
  })
  .build();

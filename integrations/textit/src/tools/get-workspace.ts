import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getWorkspace = SlateTool.create(spec, {
  name: 'Get Workspace',
  key: 'get_workspace',
  description: `Retrieve information about the current TextIt workspace including name, country, supported languages, timezone, and date formatting preferences.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      workspaceUuid: z.string(),
      name: z.string(),
      country: z.string(),
      languages: z.array(z.string()),
      timezone: z.string(),
      dateStyle: z.string(),
      anon: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let workspace = await client.getWorkspace();

    return {
      output: {
        workspaceUuid: workspace.uuid,
        name: workspace.name,
        country: workspace.country,
        languages: workspace.languages,
        timezone: workspace.timezone,
        dateStyle: workspace.date_style,
        anon: workspace.anon
      },
      message: `Workspace: **${workspace.name}** (${workspace.country}, ${workspace.timezone}).`
    };
  })
  .build();

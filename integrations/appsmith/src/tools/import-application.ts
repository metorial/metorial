import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let importApplication = SlateTool.create(spec, {
  name: 'Import Application',
  key: 'import_application',
  description: `Import an Appsmith application into a workspace from a JSON definition. The JSON should be in the format produced by the export application tool. Datasource credentials must be reconfigured after import.`,
  constraints: [
    'Datasource credentials are not included in imports and must be reconfigured manually after the application is imported.'
  ]
})
  .input(
    z.object({
      workspaceId: z.string().describe('The workspace ID to import the application into.'),
      applicationJson: z
        .any()
        .describe(
          'The full application JSON definition to import (as produced by the export tool).'
        )
    })
  )
  .output(
    z.object({
      applicationId: z
        .string()
        .optional()
        .describe('The ID of the newly imported application.'),
      name: z.string().optional().describe('The name of the imported application.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    let app = await client.importApplication(ctx.input.workspaceId, ctx.input.applicationJson);

    return {
      output: {
        applicationId: app.id,
        name: app.name
      },
      message: `Imported application **${app.name ?? 'Unknown'}** (ID: ${app.id ?? 'unknown'}) into workspace ${ctx.input.workspaceId}.`
    };
  })
  .build();

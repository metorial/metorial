import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let importApplication = SlateTool.create(spec, {
  name: 'Import Application',
  key: 'import_application',
  description: `Import an Appsmith application into a workspace from a JSON definition. The JSON should be in the format produced by the export application tool. Datasource credentials must be reconfigured after import.`,
  constraints: [
    'Embedded decrypted credential fields are refused. Import requires a native CSRF cookie; reconfigure datasources afterward.'
  ]
})
  .input(
    z.object({
      workspaceId: z.string().describe('The workspace ID to import the application into.'),
      applicationJson: z
        .any()
        .describe(
          'The full application JSON definition to import (from the downloaded export file, either as JSON text or an object).'
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
    const client = clientFor(ctx);

    let app = await client.importApplication(ctx.input.workspaceId, ctx.input.applicationJson);

    return {
      output: {
        applicationId: app.id,
        name: app.name
      },
      message: `Imported application **${app.name}** (ID: ${app.id}) into workspace ${ctx.input.workspaceId}.`
    };
  })
  .build();

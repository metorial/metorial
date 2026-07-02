import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let exportApplication = SlateTool.create(spec, {
  name: 'Export Application',
  key: 'export_application',
  description: `Export an Appsmith application as a JSON object. The exported JSON contains the full application definition including pages, queries, JS objects, and widget configurations. Datasource credentials are excluded for security.`,
  constraints: [
    'Datasource credentials are not included in the export and must be reconfigured after import.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      applicationId: z.string().describe('The ID of the application to export.')
    })
  )
  .output(
    z.object({
      applicationJson: z
        .any()
        .describe('The full exported application definition as a JSON object.'),
      applicationName: z.string().optional().describe('The name of the exported application.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    let exportedData = await client.exportApplication(ctx.input.applicationId);

    let appName = exportedData?.exportedApplication?.name ?? exportedData?.name ?? 'Unknown';

    return {
      output: {
        applicationJson: exportedData,
        applicationName: appName
      },
      message: `Exported application **${appName}**.`
    };
  })
  .build();

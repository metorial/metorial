import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let publishApplication = SlateTool.create(spec, {
  name: 'Publish Application',
  key: 'publish_application',
  description: `Publish or unpublish a Budibase application or workspace. Publication reports the native deployment outcome; a failed deployment is not described as completed publication. Unpublish takes the workspace offline. Deployment history and external effects are retained.`,
  instructions: [
    'Use the appId of the development version (app_dev_*) when publishing or unpublishing.'
  ]
})
  .input(
    z.object({
      appId: z.string().describe('Application ID to publish or unpublish'),
      action: z
        .enum(['publish', 'unpublish'])
        .describe('Whether to publish or unpublish the application')
    })
  )
  .output(
    z.object({
      appId: z.string().describe('Application ID'),
      published: z
        .boolean()
        .describe(
          'Whether publication succeeded; false for a failed deployment or completed unpublish'
        ),
      deploymentId: z.string().optional(),
      deploymentStatus: z.enum(['SUCCESS', 'FAILURE']).optional(),
      appUrl: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = Client.fromContext(ctx);

    if (ctx.input.action === 'publish') {
      const deployment = await client.publishApplication(ctx.input.appId);
      const published = deployment.status === 'SUCCESS';
      return {
        output: {
          appId: ctx.input.appId,
          published,
          deploymentId: String(deployment._id),
          deploymentStatus: published ? ('SUCCESS' as const) : ('FAILURE' as const),
          appUrl: String(deployment.appUrl)
        },
        message: published
          ? 'Publication completed with a successful deployment receipt.'
          : 'The deployment failed; publication was not confirmed.'
      };
    }

    await client.unpublishApplication(ctx.input.appId);
    return {
      output: { appId: ctx.input.appId, published: false },
      message: `Unpublished application **${ctx.input.appId}**.`
    };
  })
  .build();

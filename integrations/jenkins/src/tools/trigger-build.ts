import { SlateTool } from 'slates';
import { z } from 'zod';
import { JenkinsClient } from '../lib/client';
import { spec } from '../spec';

export let triggerBuild = SlateTool.create(spec, {
  name: 'Trigger Build',
  key: 'trigger_build',
  description: `Trigger a new build for a Jenkins job. Supports parameterized builds by passing key-value parameters. Returns the queue URL for the triggered build which can be used to track build progress.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      jobPath: z
        .string()
        .describe('Path to the job to build (e.g. "my-job" or "folder/my-job")'),
      parameters: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Build parameters as key-value pairs (e.g. {"BRANCH": "main", "DEPLOY": "true"})'
        )
    })
  )
  .output(
    z.object({
      triggered: z.boolean().describe('Whether the build was triggered'),
      queueUrl: z
        .string()
        .optional()
        .nullable()
        .describe('URL of the queue item for the triggered build')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JenkinsClient({
      instanceUrl: ctx.config.instanceUrl,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let result = await client.triggerBuild(ctx.input.jobPath, ctx.input.parameters);
    ctx.info(`Build triggered, queue URL: ${result.queueUrl}`);

    return {
      output: {
        triggered: true,
        queueUrl: result.queueUrl
      },
      message: `Build triggered for job \`${ctx.input.jobPath}\`${ctx.input.parameters ? ` with ${Object.keys(ctx.input.parameters).length} parameter(s)` : ''}.${result.queueUrl ? ` Queue item: ${result.queueUrl}` : ''}`
    };
  })
  .build();

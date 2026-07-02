import { SlateTool } from 'slates';
import { z } from 'zod';
import { JenkinsClient } from '../lib/client';
import { spec } from '../spec';

export let stopBuild = SlateTool.create(spec, {
  name: 'Stop Build',
  key: 'stop_build',
  description: `Stop, terminate, or kill a running Jenkins build. Use **stop** for a graceful stop, **terminate** for a harder stop, or **kill** to forcefully end the build process.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      jobPath: z.string().describe('Path to the job (e.g. "my-job" or "folder/my-job")'),
      buildNumber: z.number().describe('Build number to stop'),
      method: z
        .enum(['stop', 'terminate', 'kill'])
        .optional()
        .describe('Method to stop the build. Defaults to "stop" (graceful).')
    })
  )
  .output(
    z.object({
      stopped: z.boolean().describe('Whether the stop request was sent'),
      method: z.string().describe('The method used to stop the build')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JenkinsClient({
      instanceUrl: ctx.config.instanceUrl,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let method = ctx.input.method || 'stop';

    switch (method) {
      case 'stop':
        await client.stopBuild(ctx.input.jobPath, ctx.input.buildNumber);
        break;
      case 'terminate':
        await client.terminateBuild(ctx.input.jobPath, ctx.input.buildNumber);
        break;
      case 'kill':
        await client.killBuild(ctx.input.jobPath, ctx.input.buildNumber);
        break;
    }

    return {
      output: {
        stopped: true,
        method
      },
      message: `Sent **${method}** request for build **#${ctx.input.buildNumber}** of \`${ctx.input.jobPath}\`.`
    };
  })
  .build();

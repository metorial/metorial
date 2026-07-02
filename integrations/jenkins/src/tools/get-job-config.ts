import { SlateTool } from 'slates';
import { z } from 'zod';
import { JenkinsClient } from '../lib/client';
import { spec } from '../spec';

export let getJobConfig = SlateTool.create(spec, {
  name: 'Get Job Config',
  key: 'get_job_config',
  description: `Retrieve the raw XML configuration of a Jenkins job. Useful for inspecting the full job configuration, cloning job settings, or preparing configuration updates.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobPath: z.string().describe('Path to the job (e.g. "my-job" or "folder/my-job")')
    })
  )
  .output(
    z.object({
      jobPath: z.string().describe('Path of the job'),
      xmlConfig: z.string().describe('Full XML configuration of the job')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JenkinsClient({
      instanceUrl: ctx.config.instanceUrl,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let xmlConfig = await client.getJobConfig(ctx.input.jobPath);

    return {
      output: {
        jobPath: ctx.input.jobPath,
        xmlConfig
      },
      message: `Retrieved XML configuration for job \`${ctx.input.jobPath}\` (${xmlConfig.length} characters).`
    };
  })
  .build();

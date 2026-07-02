import { SlateTool } from 'slates';
import { z } from 'zod';
import { JenkinsClient } from '../lib/client';
import { spec } from '../spec';

export let manageJob = SlateTool.create(spec, {
  name: 'Manage Job',
  key: 'manage_job',
  description: `Create, copy, enable, disable, delete, or update the configuration of a Jenkins job.
For **create** and **update**, provide the job's XML configuration.
For **copy**, specify the source job name and new job name.
For **enable**, **disable**, and **delete**, only the job path is required.`,
  instructions: [
    'For create/update actions, xmlConfig must be a valid Jenkins job XML configuration.',
    'Jobs in folders use slash-separated paths, e.g. "my-folder/my-job".'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'copy', 'enable', 'disable', 'delete', 'update_config'])
        .describe('Action to perform on the job'),
      jobPath: z
        .string()
        .describe(
          'Path to the job (e.g. "my-job" or "folder/my-job"). For "create", this is the new job name.'
        ),
      folderPath: z
        .string()
        .optional()
        .describe(
          'Folder in which to create or copy the job. Only used with "create" and "copy" actions.'
        ),
      xmlConfig: z
        .string()
        .optional()
        .describe(
          'XML configuration for the job. Required for "create" and "update_config" actions.'
        ),
      sourceJobName: z
        .string()
        .optional()
        .describe('Source job name to copy from. Required for "copy" action.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      action: z.string().describe('The action that was performed'),
      jobPath: z.string().describe('Path of the affected job')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JenkinsClient({
      instanceUrl: ctx.config.instanceUrl,
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let { action, jobPath, folderPath, xmlConfig, sourceJobName } = ctx.input;

    switch (action) {
      case 'create':
        if (!xmlConfig) throw new Error('xmlConfig is required for create action');
        await client.createJob(jobPath, xmlConfig, folderPath);
        break;
      case 'copy':
        if (!sourceJobName) throw new Error('sourceJobName is required for copy action');
        await client.copyJob(sourceJobName, jobPath, folderPath);
        break;
      case 'enable':
        await client.enableJob(jobPath);
        break;
      case 'disable':
        await client.disableJob(jobPath);
        break;
      case 'delete':
        await client.deleteJob(jobPath);
        break;
      case 'update_config':
        if (!xmlConfig) throw new Error('xmlConfig is required for update_config action');
        await client.updateJobConfig(jobPath, xmlConfig);
        break;
    }

    return {
      output: {
        success: true,
        action,
        jobPath
      },
      message: `Successfully **${action.replace('_', ' ')}** job \`${jobPath}\`.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let revisionSchema = z
  .object({
    ref: z.string().optional().describe('Commit SHA'),
    message: z.string().optional().describe('Commit message'),
    author: z.string().optional().describe('Commit author name')
  })
  .nullable()
  .optional();

export let getDeployment = SlateTool.create(spec, {
  name: 'Get Deployment',
  key: 'get_deployment',
  description: `Retrieve detailed information about a specific deployment including status, timing, revision details, deployer, and file changes. Use this to check the progress or results of a deployment.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectPermalink: z.string().describe('The permalink (slug) of the project'),
      deploymentIdentifier: z.string().describe('The deployment identifier (UUID)')
    })
  )
  .output(
    z.object({
      deploymentIdentifier: z.string().describe('Unique deployment identifier'),
      status: z
        .string()
        .describe('Deployment status (e.g., completed, failed, pending, running)'),
      deployer: z.string().optional().describe('Who triggered the deployment'),
      branch: z.string().optional().describe('Deployed branch'),
      startRevision: revisionSchema.describe('Start revision details'),
      endRevision: revisionSchema.describe('End revision details'),
      queuedAt: z.string().optional().describe('When the deployment was queued'),
      startedAt: z.string().nullable().optional().describe('When the deployment started'),
      completedAt: z.string().nullable().optional().describe('When the deployment completed'),
      duration: z.number().nullable().optional().describe('Deployment duration in seconds'),
      copyConfigFiles: z.boolean().optional().describe('Whether config files were copied')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email,
      accountName: ctx.config.accountName
    });

    let d = await client.getDeployment(
      ctx.input.projectPermalink,
      ctx.input.deploymentIdentifier
    );

    return {
      output: {
        deploymentIdentifier: d.identifier,
        status: d.status,
        deployer: d.deployer,
        branch: d.branch,
        startRevision: d.start_revision
          ? {
              ref: d.start_revision.ref,
              message: d.start_revision.message,
              author: d.start_revision.author
            }
          : null,
        endRevision: d.end_revision
          ? {
              ref: d.end_revision.ref,
              message: d.end_revision.message,
              author: d.end_revision.author
            }
          : null,
        queuedAt: d.queued_at,
        startedAt: d.started_at ?? null,
        completedAt: d.completed_at ?? null,
        duration: d.duration ?? null,
        copyConfigFiles: d.copy_config_files
      },
      message: `Deployment \`${d.identifier}\` is **${d.status}**${d.duration ? ` (${d.duration}s)` : ''}.`
    };
  })
  .build();

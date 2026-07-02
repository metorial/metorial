import { SlateTool } from 'slates';
import { z } from 'zod';
import { SeqeraClient } from '../lib/client';
import { spec } from '../spec';

export let manageComputeEnv = SlateTool.create(spec, {
  name: 'Manage Compute Environment',
  key: 'manage_compute_env',
  description: `Get details about, set as primary, or delete a compute environment. Use **action** to specify the operation to perform.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      computeEnvId: z.string().describe('The compute environment ID'),
      action: z
        .enum(['describe', 'set_primary', 'delete'])
        .describe('Action to perform on the compute environment')
    })
  )
  .output(
    z.object({
      computeEnvId: z.string().optional().describe('Compute environment ID'),
      name: z.string().optional().describe('Compute environment name'),
      description: z.string().optional().describe('Description'),
      platform: z.string().optional().describe('Cloud platform'),
      status: z.string().optional().describe('Current status'),
      primary: z
        .boolean()
        .optional()
        .describe('Whether this is the primary compute environment'),
      workDir: z.string().optional().describe('Default work directory'),
      deleted: z.boolean().optional().describe('Whether the compute environment was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SeqeraClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      workspaceId: ctx.config.workspaceId
    });

    if (ctx.input.action === 'delete') {
      await client.deleteComputeEnv(ctx.input.computeEnvId);
      return {
        output: {
          computeEnvId: ctx.input.computeEnvId,
          deleted: true
        },
        message: `Compute environment **${ctx.input.computeEnvId}** has been deleted.`
      };
    }

    if (ctx.input.action === 'set_primary') {
      await client.setPrimaryComputeEnv(ctx.input.computeEnvId);
      let env = await client.describeComputeEnv(ctx.input.computeEnvId);
      return {
        output: {
          computeEnvId: env.id,
          name: env.name,
          description: env.description,
          platform: env.platform,
          status: env.status,
          primary: true,
          workDir: env.workDir
        },
        message: `Compute environment **${env.name || ctx.input.computeEnvId}** set as primary.`
      };
    }

    let env = await client.describeComputeEnv(ctx.input.computeEnvId);
    return {
      output: {
        computeEnvId: env.id,
        name: env.name,
        description: env.description,
        platform: env.platform,
        status: env.status,
        primary: env.primary,
        workDir: env.workDir
      },
      message: `Compute environment **${env.name || ctx.input.computeEnvId}** — Platform: **${env.platform || 'unknown'}**, Status: **${env.status || 'unknown'}**.`
    };
  })
  .build();

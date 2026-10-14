import { SlateTool } from 'slates';
import { z } from 'zod';
import { SeqeraClient } from '../lib/client';
import { workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listComputeEnvs = SlateTool.create(spec, {
  name: 'List Compute Environments',
  key: 'list_compute_envs',
  description: `List compute environments in a workspace. Compute environments define the execution platform (AWS Batch, Google Cloud, Azure, Kubernetes, etc.) where pipelines run.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      status: z
        .string()
        .optional()
        .describe('Filter by status (e.g., AVAILABLE, CREATING, ERRORED)')
    })
  )
  .output(
    z.object({
      computeEnvs: z
        .array(
          z.object({
            computeEnvId: z.string().optional().describe('Compute environment ID'),
            name: z.string().optional().describe('Compute environment name'),
            description: z.string().optional().describe('Description'),
            platform: z
              .string()
              .optional()
              .describe(
                'Cloud platform (e.g., aws-batch, google-lifesciences, azure-batch, k8s)'
              ),
            status: z.string().optional().describe('Current status'),
            primary: z
              .boolean()
              .optional()
              .describe('Whether this is the primary compute environment'),
            workDir: z.string().optional().describe('Default work directory'),
            credentialsId: z.string().optional().describe('Associated credentials ID'),
            dateCreated: z.string().optional().describe('Creation date'),
            lastUsed: z.string().optional().describe('Last used date')
          })
        )
        .describe('List of compute environments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SeqeraClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl,
      workspaceId: ctx.input.workspaceId ?? ctx.config.workspaceId
    });

    let envs = await client.listComputeEnvs({
      status: ctx.input.status
    });

    let computeEnvs = envs.map(e => ({
      computeEnvId: e.id ?? undefined,
      name: e.name ?? undefined,
      description: e.description ?? undefined,
      platform: e.platform ?? undefined,
      status: e.status ?? undefined,
      primary: e.primary ?? undefined,
      workDir: e.workDir ?? undefined,
      credentialsId: e.credentialsId ?? undefined,
      dateCreated: e.dateCreated ?? undefined,
      lastUsed: e.lastUsed ?? undefined
    }));

    return {
      output: { computeEnvs },
      message: `Found **${computeEnvs.length}** compute environments.`
    };
  })
  .build();

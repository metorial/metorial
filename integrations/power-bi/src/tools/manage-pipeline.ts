import { SlateTool } from 'slates';
import { z } from 'zod';
import { PowerBIClient } from '../lib/client';
import { spec } from '../spec';

let stageSchema = z.object({
  order: z.number().describe('Stage order (0=Development, 1=Test, 2=Production)'),
  workspaceId: z.string().optional().describe('Workspace assigned to this stage'),
  workspaceName: z.string().optional().describe('Name of the assigned workspace')
});

let operationSchema = z.object({
  operationId: z.string().describe('Operation ID'),
  status: z.string().describe('Operation status'),
  sourceStageOrder: z.number().optional(),
  targetStageOrder: z.number().optional(),
  lastUpdatedTime: z.string().optional()
});

export let managePipeline = SlateTool.create(spec, {
  name: 'Manage Deployment Pipeline',
  key: 'manage_pipeline',
  description: `List deployment pipelines, view pipeline stages and artifacts, deploy content between stages, or check deployment operation status.`,
  instructions: [
    'Use "list" to see all available deployment pipelines.',
    'Use "get" to view stages and workspace assignments for a specific pipeline.',
    'Use "deploy" to promote content from one stage to the next.',
    'Use "operations" to check deployment history and operation status.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'deploy', 'operations']).describe('Action to perform'),
      pipelineId: z
        .string()
        .optional()
        .describe('Pipeline ID (required for get, deploy, operations)'),
      sourceStageOrder: z
        .number()
        .optional()
        .describe('Source stage order for deployment (0=Dev, 1=Test, 2=Prod)'),
      isBackwardDeployment: z
        .boolean()
        .optional()
        .describe('Whether this is a backward deployment'),
      deployOptions: z
        .object({
          allowCreateArtifact: z.boolean().optional(),
          allowOverwriteArtifact: z.boolean().optional()
        })
        .optional()
        .describe('Deployment options')
    })
  )
  .output(
    z.object({
      pipelines: z
        .array(
          z.object({
            pipelineId: z.string(),
            displayName: z.string(),
            description: z.string().optional()
          })
        )
        .optional()
        .describe('List of pipelines'),
      stages: z.array(stageSchema).optional().describe('Pipeline stages'),
      operations: z.array(operationSchema).optional().describe('Pipeline operations'),
      deploymentOperationId: z
        .string()
        .optional()
        .describe('ID of the triggered deployment operation'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PowerBIClient({ token: ctx.auth.token });
    let { action, pipelineId } = ctx.input;

    if (action === 'list') {
      let pipelines = await client.listPipelines();
      return {
        output: {
          pipelines: pipelines.map((p: any) => ({
            pipelineId: p.id,
            displayName: p.displayName,
            description: p.description
          })),
          success: true
        },
        message: `Found **${pipelines.length}** deployment pipeline(s).`
      };
    }

    if (!pipelineId) throw new Error('pipelineId is required');

    if (action === 'get') {
      let pipeline = await client.getPipeline(pipelineId);
      let stages = (pipeline.stages || []).map((s: any) => ({
        order: s.order,
        workspaceId: s.workspaceId,
        workspaceName: s.workspaceName
      }));
      return {
        output: { stages, success: true },
        message: `Pipeline has **${stages.length}** stage(s).`
      };
    }

    if (action === 'deploy') {
      if (ctx.input.sourceStageOrder === undefined)
        throw new Error('sourceStageOrder is required for deploy');
      let result = await client.deployPipelineStage(pipelineId, {
        sourceStageOrder: ctx.input.sourceStageOrder,
        isBackwardDeployment: ctx.input.isBackwardDeployment || false,
        options: ctx.input.deployOptions || {
          allowCreateArtifact: true,
          allowOverwriteArtifact: true
        }
      });
      let operationId = result.id;
      return {
        output: { deploymentOperationId: operationId, success: true },
        message: `Deployment triggered from stage **${ctx.input.sourceStageOrder}**. Operation ID: **${operationId || 'unknown'}**.`
      };
    }

    if (action === 'operations') {
      let operations = await client.getPipelineOperations(pipelineId);
      return {
        output: {
          operations: operations.map((o: any) => ({
            operationId: o.id,
            status: o.status,
            sourceStageOrder: o.sourceStageOrder,
            targetStageOrder: o.targetStageOrder,
            lastUpdatedTime: o.lastUpdatedTime
          })),
          success: true
        },
        message: `Found **${operations.length}** operation(s) for pipeline.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();

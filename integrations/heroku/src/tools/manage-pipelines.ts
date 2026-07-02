import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { herokuServiceError } from '../lib/errors';
import { spec } from '../spec';

export let managePipelines = SlateTool.create(spec, {
  name: 'Manage Pipelines',
  key: 'manage_pipelines',
  description: `Manage Heroku Pipelines for continuous delivery workflows. List, create, update, or delete pipelines, manage pipeline couplings that link apps to stages, and promote releases between pipeline apps.`,
  instructions: [
    'Use "list_couplings" to see which apps are in each stage of a pipeline.',
    'Use "add_app" to couple an app to a pipeline stage.',
    'Use "remove_app" to decouple an app from a pipeline.',
    'Use "promote" with source app, source release, and target app IDs to promote code between pipeline stages.'
  ]
})
  .input(
    z.object({
      action: z
        .enum([
          'list',
          'get',
          'create',
          'update',
          'delete',
          'list_couplings',
          'add_app',
          'remove_app',
          'promote',
          'get_promotion',
          'list_promotion_targets'
        ])
        .describe('Operation to perform'),
      pipelineIdOrName: z.string().optional().describe('Pipeline ID or name'),
      name: z.string().optional().describe('Pipeline name (for create/update)'),
      appIdOrName: z.string().optional().describe('App ID or name (for add_app)'),
      stage: z
        .string()
        .optional()
        .describe('Pipeline stage: "development", "staging", "production" (for add_app)'),
      couplingId: z.string().optional().describe('Pipeline coupling ID (for remove_app)'),
      promotionId: z
        .string()
        .optional()
        .describe('Pipeline promotion ID (for get_promotion and list_promotion_targets)'),
      sourceAppId: z.string().optional().describe('Source app ID for a pipeline promotion'),
      sourceReleaseId: z
        .string()
        .optional()
        .describe('Source release ID for a pipeline promotion'),
      targetAppIds: z
        .array(z.string())
        .optional()
        .describe('Target app IDs for a pipeline promotion')
    })
  )
  .output(
    z.object({
      pipelines: z
        .array(
          z.object({
            pipelineId: z.string().describe('Unique identifier of the pipeline'),
            name: z.string().describe('Name of the pipeline'),
            createdAt: z.string().describe('When the pipeline was created'),
            updatedAt: z.string().describe('When the pipeline was last updated')
          })
        )
        .optional(),
      couplings: z
        .array(
          z.object({
            couplingId: z.string().describe('Unique identifier of the coupling'),
            pipelineId: z.string().describe('Pipeline ID'),
            appId: z.string().describe('App ID'),
            appName: z.string().describe('App name'),
            stage: z.string().describe('Pipeline stage')
          })
        )
        .optional(),
      promotions: z
        .array(
          z.object({
            promotionId: z.string().describe('Unique identifier of the promotion'),
            pipelineId: z.string().describe('Pipeline ID'),
            sourceAppId: z.string().describe('Source app ID'),
            sourceReleaseId: z.string().describe('Source release ID'),
            status: z.string().describe('Promotion status'),
            createdAt: z.string().describe('When the promotion was created'),
            updatedAt: z.string().nullable().describe('When the promotion was last updated')
          })
        )
        .optional(),
      promotionTargets: z
        .array(
          z.object({
            targetId: z.string().describe('Unique identifier of the promotion target'),
            appId: z.string().describe('Target app ID'),
            promotionId: z.string().describe('Promotion ID'),
            releaseId: z.string().nullable().describe('Release created on the target app'),
            status: z.string().describe('Promotion target status'),
            errorMessage: z.string().nullable().describe('Failure reason, if any')
          })
        )
        .optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action } = ctx.input;

    let mapPipeline = (p: any) => ({
      pipelineId: p.pipelineId,
      name: p.name,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    });

    let mapCoupling = (c: any) => ({
      couplingId: c.couplingId,
      pipelineId: c.pipelineId,
      appId: c.appId,
      appName: c.appName,
      stage: c.stage
    });

    let mapPromotion = (p: any) => ({
      promotionId: p.promotionId,
      pipelineId: p.pipelineId,
      sourceAppId: p.sourceAppId,
      sourceReleaseId: p.sourceReleaseId,
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    });

    let mapPromotionTarget = (target: any) => ({
      targetId: target.targetId,
      appId: target.appId,
      promotionId: target.promotionId,
      releaseId: target.releaseId,
      status: target.status,
      errorMessage: target.errorMessage
    });

    if (action === 'list') {
      let pipelines = await client.listPipelines();
      return {
        output: { pipelines: pipelines.map(mapPipeline) },
        message: `Found **${pipelines.length}** pipeline(s).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.pipelineIdOrName)
        throw herokuServiceError('pipelineIdOrName is required.');
      let pipeline = await client.getPipeline(ctx.input.pipelineIdOrName);
      return {
        output: { pipelines: [mapPipeline(pipeline)] },
        message: `Retrieved pipeline **${pipeline.name}**.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw herokuServiceError('name is required for "create" action.');
      let pipeline = await client.createPipeline({ name: ctx.input.name });
      return {
        output: { pipelines: [mapPipeline(pipeline)] },
        message: `Created pipeline **${pipeline.name}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.pipelineIdOrName)
        throw herokuServiceError('pipelineIdOrName is required.');
      let pipeline = await client.updatePipeline(ctx.input.pipelineIdOrName, {
        name: ctx.input.name
      });
      return {
        output: { pipelines: [mapPipeline(pipeline)] },
        message: `Updated pipeline **${pipeline.name}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.pipelineIdOrName)
        throw herokuServiceError('pipelineIdOrName is required.');
      await client.deletePipeline(ctx.input.pipelineIdOrName);
      return {
        output: { deleted: true },
        message: `Deleted pipeline **${ctx.input.pipelineIdOrName}**.`
      };
    }

    if (action === 'list_couplings') {
      if (!ctx.input.pipelineIdOrName)
        throw herokuServiceError('pipelineIdOrName is required.');
      let couplings = await client.listPipelineCouplings(ctx.input.pipelineIdOrName);
      return {
        output: { couplings: couplings.map(mapCoupling) },
        message: `Found **${couplings.length}** app(s) in pipeline.`
      };
    }

    if (action === 'add_app') {
      if (!ctx.input.pipelineIdOrName)
        throw herokuServiceError('pipelineIdOrName is required.');
      if (!ctx.input.appIdOrName) throw herokuServiceError('appIdOrName is required.');
      if (!ctx.input.stage) throw herokuServiceError('stage is required.');
      let coupling = await client.createPipelineCoupling({
        pipelineId: ctx.input.pipelineIdOrName,
        appIdOrName: ctx.input.appIdOrName,
        stage: ctx.input.stage
      });
      return {
        output: { couplings: [mapCoupling(coupling)] },
        message: `Added app **${coupling.appName}** to pipeline stage **${coupling.stage}**.`
      };
    }

    if (action === 'promote') {
      if (!ctx.input.pipelineIdOrName)
        throw herokuServiceError('pipelineIdOrName is required for "promote" action.');
      if (!ctx.input.sourceAppId)
        throw herokuServiceError('sourceAppId is required for "promote" action.');
      if (!ctx.input.sourceReleaseId)
        throw herokuServiceError('sourceReleaseId is required for "promote" action.');
      if (!ctx.input.targetAppIds || ctx.input.targetAppIds.length === 0) {
        throw herokuServiceError('targetAppIds is required for "promote" action.');
      }

      let promotion = await client.createPipelinePromotion({
        pipelineId: ctx.input.pipelineIdOrName,
        sourceAppId: ctx.input.sourceAppId,
        sourceReleaseId: ctx.input.sourceReleaseId,
        targetAppIds: ctx.input.targetAppIds
      });
      return {
        output: { promotions: [mapPromotion(promotion)] },
        message: `Started promotion **${promotion.promotionId}** for pipeline **${promotion.pipelineId}**.`
      };
    }

    if (action === 'get_promotion') {
      if (!ctx.input.promotionId)
        throw herokuServiceError('promotionId is required for "get_promotion" action.');
      let promotion = await client.getPipelinePromotion(ctx.input.promotionId);
      return {
        output: { promotions: [mapPromotion(promotion)] },
        message: `Promotion **${promotion.promotionId}** status: ${promotion.status}.`
      };
    }

    if (action === 'list_promotion_targets') {
      if (!ctx.input.promotionId)
        throw herokuServiceError(
          'promotionId is required for "list_promotion_targets" action.'
        );
      let targets = await client.listPipelinePromotionTargets(ctx.input.promotionId);
      return {
        output: { promotionTargets: targets.map(mapPromotionTarget) },
        message: `Found **${targets.length}** promotion target(s).`
      };
    }

    // remove_app
    if (!ctx.input.couplingId)
      throw herokuServiceError('couplingId is required for "remove_app" action.');
    await client.deletePipelineCoupling(ctx.input.couplingId);
    return {
      output: { deleted: true },
      message: `Removed app from pipeline.`
    };
  })
  .build();

import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { pipedriveServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let managePipelines = SlateTool.create(spec, {
  name: 'Manage Pipelines & Stages',
  key: 'manage_pipelines',
  description: `Manage sales pipelines and their stages in Pipedrive. Create, update, or delete pipelines and stages.
Use this tool to configure your sales process structure. Stages define the steps within a pipeline that deals flow through.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      resourceType: z.enum(['pipeline', 'stage']).describe('Type of resource to manage'),
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      pipelineId: z
        .number()
        .optional()
        .describe('Pipeline ID (required for pipeline update/delete, and for stage create)'),
      stageId: z.number().optional().describe('Stage ID (required for stage update/delete)'),
      name: z.string().optional().describe('Name of the pipeline or stage'),
      orderNr: z.number().optional().describe('Order number for stages within a pipeline'),
      dealProbability: z
        .boolean()
        .optional()
        .describe('Whether pipeline deal probability is enabled'),
      active: z.boolean().optional().describe('Whether the pipeline or stage is active'),
      rottingEnabled: z
        .boolean()
        .optional()
        .describe('Whether deal rotting is enabled for this stage'),
      rottingDays: z.number().optional().describe('Number of days for deal rotting')
    })
  )
  .output(
    z.object({
      pipelineId: z.number().optional().describe('Pipeline ID'),
      stageId: z.number().optional().describe('Stage ID'),
      name: z.string().optional().describe('Name'),
      orderNr: z.number().optional().describe('Order number'),
      active: z.boolean().optional().describe('Whether active'),
      addTime: z.string().optional().describe('Creation timestamp'),
      updateTime: z.string().optional().nullable().describe('Last update timestamp'),
      deleted: z.boolean().optional().describe('Whether the resource was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { resourceType, action } = ctx.input;

    if (resourceType === 'pipeline') {
      if (action === 'delete') {
        if (!ctx.input.pipelineId)
          throw pipedriveServiceError('pipelineId is required for delete');
        await client.deletePipeline(ctx.input.pipelineId);
        return {
          output: { pipelineId: ctx.input.pipelineId, deleted: true },
          message: `Pipeline **#${ctx.input.pipelineId}** has been deleted.`
        };
      }

      let body: Record<string, any> = {};
      if (ctx.input.name) body.name = ctx.input.name;
      if (ctx.input.dealProbability !== undefined)
        body.deal_probability = ctx.input.dealProbability ? 1 : 0;
      if (ctx.input.active !== undefined) body.active = ctx.input.active ? 1 : 0;
      if (ctx.input.orderNr !== undefined) body.order_nr = ctx.input.orderNr;

      let result: any;
      if (action === 'create') {
        result = await client.createPipeline(body);
      } else {
        if (!ctx.input.pipelineId)
          throw pipedriveServiceError('pipelineId is required for update');
        result = await client.updatePipeline(ctx.input.pipelineId, body);
      }

      let pipeline = result?.data;
      return {
        output: {
          pipelineId: pipeline?.id,
          name: pipeline?.name,
          orderNr: pipeline?.order_nr,
          active: pipeline?.active,
          addTime: pipeline?.add_time,
          updateTime: pipeline?.update_time
        },
        message: `Pipeline **"${pipeline?.name}"** (ID: ${pipeline?.id}) has been ${action === 'create' ? 'created' : 'updated'}.`
      };
    }

    // Stage management
    if (action === 'delete') {
      if (!ctx.input.stageId) throw pipedriveServiceError('stageId is required for delete');
      await client.deleteStage(ctx.input.stageId);
      return {
        output: { stageId: ctx.input.stageId, deleted: true },
        message: `Stage **#${ctx.input.stageId}** has been deleted.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.pipelineId) body.pipeline_id = ctx.input.pipelineId;
    if (ctx.input.orderNr !== undefined) body.order_nr = ctx.input.orderNr;
    if (ctx.input.rottingEnabled !== undefined)
      body.rotten_flag = ctx.input.rottingEnabled ? 1 : 0;
    if (ctx.input.rottingDays !== undefined) body.rotten_days = ctx.input.rottingDays;

    let result: any;
    if (action === 'create') {
      result = await client.createStage(body);
    } else {
      if (!ctx.input.stageId) throw pipedriveServiceError('stageId is required for update');
      result = await client.updateStage(ctx.input.stageId, body);
    }

    let stage = result?.data;
    return {
      output: {
        stageId: stage?.id,
        pipelineId: stage?.pipeline_id,
        name: stage?.name,
        orderNr: stage?.order_nr,
        active: stage?.active_flag,
        addTime: stage?.add_time,
        updateTime: stage?.update_time
      },
      message: `Stage **"${stage?.name}"** (ID: ${stage?.id}) has been ${action === 'create' ? 'created' : 'updated'}.`
    };
  });

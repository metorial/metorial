import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

export let scaleService = SlateTool.create(spec, {
  name: 'Scale Service',
  key: 'scale_service',
  description: `Scale a Render service manually or configure autoscaling. Use **manual** to set a fixed instance count, **autoscale** to configure CPU/memory-based autoscaling rules, or **disable_autoscale** to remove autoscaling and revert to manual scaling.`
})
  .input(
    z.object({
      serviceId: z.string().describe('The service ID (e.g., srv-abc123)'),
      mode: z.enum(['manual', 'autoscale', 'disable_autoscale']).describe('Scaling mode'),
      numInstances: z.number().optional().describe('Fixed instance count (manual mode)'),
      minInstances: z.number().optional().describe('Minimum instances (autoscale mode)'),
      maxInstances: z.number().optional().describe('Maximum instances (autoscale mode)'),
      cpuTarget: z
        .number()
        .optional()
        .describe('Target CPU utilization percentage (autoscale mode)'),
      memoryTarget: z
        .number()
        .optional()
        .describe('Target memory utilization percentage (autoscale mode)')
    })
  )
  .output(
    z.object({
      serviceId: z.string().describe('The service ID'),
      mode: z.string().describe('Scaling mode applied'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RenderClient(ctx.auth.token);
    let { serviceId, mode } = ctx.input;

    if (mode === 'manual') {
      if (ctx.input.numInstances === undefined)
        throw createApiServiceError('numInstances is required for manual scaling');
      await client.scaleService(serviceId, ctx.input.numInstances);
      return {
        output: { serviceId, mode: 'manual', success: true },
        message: `Scaled service \`${serviceId}\` to **${ctx.input.numInstances}** instance(s).`
      };
    }

    if (mode === 'autoscale') {
      let config: Record<string, any> = {};
      if (ctx.input.minInstances !== undefined) config.min = ctx.input.minInstances;
      if (ctx.input.maxInstances !== undefined) config.max = ctx.input.maxInstances;
      if (ctx.input.cpuTarget !== undefined || ctx.input.memoryTarget !== undefined) {
        config.criteria = {};
        if (ctx.input.cpuTarget !== undefined)
          config.criteria.cpu = { enabled: true, percentage: ctx.input.cpuTarget };
        if (ctx.input.memoryTarget !== undefined)
          config.criteria.memory = { enabled: true, percentage: ctx.input.memoryTarget };
      }
      await client.updateAutoscaling(serviceId, config);
      return {
        output: { serviceId, mode: 'autoscale', success: true },
        message: `Configured autoscaling for service \`${serviceId}\` (min: ${ctx.input.minInstances || 'unchanged'}, max: ${ctx.input.maxInstances || 'unchanged'}).`
      };
    }

    if (mode === 'disable_autoscale') {
      await client.deleteAutoscaling(serviceId);
      return {
        output: { serviceId, mode: 'disable_autoscale', success: true },
        message: `Disabled autoscaling for service \`${serviceId}\`.`
      };
    }

    return { output: { serviceId, mode, success: false }, message: 'Unknown scaling mode.' };
  })
  .build();

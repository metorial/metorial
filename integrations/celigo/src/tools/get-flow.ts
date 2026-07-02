import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFlow = SlateTool.create(spec, {
  name: 'Get Flow',
  key: 'get_flow',
  description: `Retrieve details of a specific flow, including its page generators (exports), page processors (imports/lookups), schedule, and dependencies.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      flowId: z.string().describe('ID of the flow to retrieve'),
      includeDependencies: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, also fetch the flow dependencies')
    })
  )
  .output(
    z.object({
      flowId: z.string().describe('Unique flow identifier'),
      name: z.string().optional().describe('Flow name'),
      disabled: z.boolean().optional().describe('Whether the flow is disabled'),
      integrationId: z.string().optional().describe('Parent integration ID'),
      lastModified: z.string().optional().describe('Last modification timestamp'),
      schedule: z.string().optional().describe('Cron schedule expression'),
      pageGenerators: z.array(z.any()).optional().describe('Export components of the flow'),
      pageProcessors: z
        .array(z.any())
        .optional()
        .describe('Import/lookup components of the flow'),
      dependencies: z.any().optional().describe('Flow dependencies, if requested'),
      rawFlow: z.any().describe('Full flow object from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let flow = await client.getFlow(ctx.input.flowId);

    let dependencies: any;
    if (ctx.input.includeDependencies) {
      try {
        dependencies = await client.getFlowDependencies(ctx.input.flowId);
      } catch (err: any) {
        dependencies = { error: err.message || 'Failed to fetch dependencies' };
      }
    }

    return {
      output: {
        flowId: flow._id,
        name: flow.name,
        disabled: flow.disabled,
        integrationId: flow._integrationId,
        lastModified: flow.lastModified,
        schedule: flow.schedule,
        pageGenerators: flow.pageGenerators,
        pageProcessors: flow.pageProcessors,
        dependencies,
        rawFlow: flow
      },
      message: `Retrieved flow **${flow.name || flow._id}** (${flow.disabled ? 'disabled' : 'enabled'}).`
    };
  })
  .build();

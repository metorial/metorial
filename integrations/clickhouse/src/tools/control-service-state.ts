import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickHouseClient } from '../lib/client';
import { spec } from '../spec';

export let controlServiceState = SlateTool.create(spec, {
  name: 'Control Service State',
  key: 'control_service_state',
  description: `Start, stop, or wake an idle ClickHouse service. A service must be stopped before it can be deleted.`,
  constraints: [
    'Use awake to wake an idle service without changing stopped services.',
    'A service must be stopped before it can be deleted.'
  ]
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service to start, stop, or wake'),
      command: z.enum(['start', 'stop', 'awake']).describe('The state transition command')
    })
  )
  .output(
    z.object({
      serviceId: z.string(),
      name: z.string().optional(),
      state: z.string().optional().describe('New transitional state of the service')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.updateServiceState(ctx.input.serviceId, ctx.input.command);

    return {
      output: {
        serviceId: result.id || ctx.input.serviceId,
        name: result.name,
        state: result.state
      },
      message: `Service **${result.name || ctx.input.serviceId}** is now **${result.state}** (command: ${ctx.input.command}).`
    };
  })
  .build();

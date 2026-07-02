import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageMaintenanceMode = SlateTool.create(spec, {
  name: 'Manage Maintenance Mode',
  key: 'manage_maintenance_mode',
  description: `Check, start, or end maintenance mode. Maintenance mode temporarily mutes alerts for specific routing keys or globally, allowing server maintenance without paging team members.`,
  instructions: [
    'Use an empty routingKeys array to start global maintenance mode.',
    'Active maintenance modes will stay active forever until manually ended.',
    'Upon ending maintenance mode, paging will resume from the beginning of escalation policies.'
  ],
  constraints: ['Only one global maintenance mode can be active at a time.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['status', 'start', 'end']).describe('Action to perform'),
      routingKeys: z
        .array(z.string())
        .optional()
        .describe(
          'Routing keys to apply maintenance mode to (empty for global). Required for start.'
        ),
      purpose: z
        .string()
        .optional()
        .describe('Description of the maintenance purpose (required for start)'),
      maintenanceModeId: z
        .string()
        .optional()
        .describe('ID of the maintenance mode instance to end (required for end)')
    })
  )
  .output(
    z.object({
      activeInstances: z
        .array(z.any())
        .optional()
        .describe('Currently active maintenance mode instances'),
      companyId: z.string().optional().describe('Organization company ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      apiId: ctx.auth.apiId,
      token: ctx.auth.token
    });

    switch (ctx.input.action) {
      case 'status': {
        let data = await client.getMaintenanceMode();
        let instances = data?.activeInstances ?? [];
        return {
          output: {
            activeInstances: instances,
            companyId: data?.companyId
          },
          message:
            instances.length > 0
              ? `**${instances.length}** active maintenance mode instance(s).`
              : `No active maintenance mode.`
        };
      }

      case 'start': {
        let data = await client.startMaintenanceMode({
          names: ctx.input.routingKeys ?? [],
          purpose: ctx.input.purpose ?? '',
          type: 'RoutingKeys'
        });
        let instances = data?.activeInstances ?? [];
        return {
          output: {
            activeInstances: instances,
            companyId: data?.companyId
          },
          message: `Started maintenance mode: **${ctx.input.purpose}**.`
        };
      }

      case 'end': {
        await client.endMaintenanceMode(ctx.input.maintenanceModeId ?? '');
        return {
          output: {},
          message: `Ended maintenance mode **${ctx.input.maintenanceModeId}**.`
        };
      }
    }
  })
  .build();

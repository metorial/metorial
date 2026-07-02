import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageIncident = SlateTool.create(spec, {
  name: 'Manage Incident',
  key: 'manage_incident',
  description: `Acknowledge, resolve, or reroute one or more incidents. Supports acknowledging/resolving specific incidents by number, all incidents for a specific user, or rerouting incidents to different escalation policies or users.`,
  instructions: [
    'Use action "acknowledge" or "resolve" with incidentNumbers to act on specific incidents.',
    'Use action "acknowledge_user" or "resolve_user" to act on all incidents paged to a specific user.',
    'Use action "reroute" to redirect incidents to different targets (users or escalation policies).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['acknowledge', 'resolve', 'acknowledge_user', 'resolve_user', 'reroute'])
        .describe('Action to perform on the incident(s)'),
      userName: z.string().describe('VictorOps username performing the action'),
      incidentNumbers: z
        .array(z.string())
        .optional()
        .describe('List of incident numbers to act on (for acknowledge, resolve, reroute)'),
      message: z.string().optional().describe('Optional message to attach to the action'),
      rerouteTargets: z
        .array(
          z.object({
            type: z.enum(['User', 'EscalationPolicy']).describe('Type of reroute target'),
            slug: z.string().describe('Identifier for the reroute target')
          })
        )
        .optional()
        .describe('Targets to reroute incidents to (required for reroute action)')
    })
  )
  .output(
    z.object({
      results: z.array(z.any()).optional().describe('Results of the action for each incident')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      apiId: ctx.auth.apiId,
      token: ctx.auth.token
    });

    let result: any;

    switch (ctx.input.action) {
      case 'acknowledge':
        result = await client.acknowledgeIncidents({
          userName: ctx.input.userName,
          incidentNames: ctx.input.incidentNumbers ?? [],
          message: ctx.input.message
        });
        break;

      case 'resolve':
        result = await client.resolveIncidents({
          userName: ctx.input.userName,
          incidentNames: ctx.input.incidentNumbers ?? [],
          message: ctx.input.message
        });
        break;

      case 'acknowledge_user':
        result = await client.acknowledgeUserIncidents({
          userName: ctx.input.userName,
          message: ctx.input.message
        });
        break;

      case 'resolve_user':
        result = await client.resolveUserIncidents({
          userName: ctx.input.userName,
          message: ctx.input.message
        });
        break;

      case 'reroute':
        result = await client.rerouteIncidents({
          userName: ctx.input.userName,
          reroutes: [
            {
              incidentNames: ctx.input.incidentNumbers ?? [],
              targets: ctx.input.rerouteTargets ?? []
            }
          ]
        });
        break;
    }

    return {
      output: {
        results: result?.results ?? result?.reroutes ?? []
      },
      message: `Successfully performed **${ctx.input.action}** on incident(s).`
    };
  })
  .build();

import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

export let projectEvents = SlateTrigger.create(spec, {
  name: 'Project Events',
  key: 'project_events',
  description:
    'Triggered when a project is created, updated, deleted, closed, or moved to a different stage in Capsule CRM.'
})
  .input(
    z.object({
      eventType: z
        .enum(['kase/created', 'kase/updated', 'kase/deleted', 'kase/closed', 'kase/moved'])
        .describe('Type of project event'),
      projects: z.array(z.any()).describe('Project records from the webhook payload')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('ID of the affected project'),
      name: z.string().optional().describe('Project name'),
      description: z.string().optional().describe('Description'),
      status: z.string().optional().describe('Status: OPEN or CLOSED'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Update timestamp'),
      closedOn: z.string().optional().describe('Close date'),
      expectedCloseOn: z.string().optional().describe('Expected close date'),
      party: z.any().optional().describe('Associated party'),
      owner: z.any().optional().describe('Assigned owner'),
      team: z.any().optional().describe('Assigned team'),
      stage: z.any().optional().describe('Current board stage')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new CapsuleClient({ token: ctx.auth.token });

      let events = [
        'kase/created',
        'kase/updated',
        'kase/deleted',
        'kase/closed',
        'kase/moved'
      ];
      let hooks: Array<{ hookId: number; event: string }> = [];

      for (let event of events) {
        let hook = await client.createRestHook({
          event,
          targetUrl: ctx.input.webhookBaseUrl,
          description: `Slates: ${event}`
        });
        hooks.push({ hookId: hook.id, event });
      }

      return {
        registrationDetails: { hooks }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new CapsuleClient({ token: ctx.auth.token });
      let hooks = (ctx.input.registrationDetails as any)?.hooks || [];

      for (let hook of hooks) {
        try {
          await client.deleteRestHook(hook.hookId);
        } catch {
          // Hook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.event,
            projects: data.payload || []
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let projects = ctx.input.projects || [];
      let eventAction = ctx.input.eventType.replace('kase/', '');

      if (projects.length === 0) {
        return {
          type: `project.${eventAction}`,
          id: `${ctx.input.eventType}-${Date.now()}`,
          output: {
            projectId: 0
          }
        };
      }

      let k = projects[0];

      return {
        type: `project.${eventAction}`,
        id: `${ctx.input.eventType}-${k.id}-${k.updatedAt || k.createdAt || Date.now()}`,
        output: {
          projectId: k.id,
          name: k.name,
          description: k.description,
          status: k.status,
          createdAt: k.createdAt,
          updatedAt: k.updatedAt,
          closedOn: k.closedOn,
          expectedCloseOn: k.expectedCloseOn,
          party: k.party,
          owner: k.owner,
          team: k.team,
          stage: k.stage
        }
      };
    }
  })
  .build();

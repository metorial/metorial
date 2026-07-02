import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let componentStatusChanges = SlateTrigger.create(spec, {
  name: 'Component Status Changes',
  key: 'component_status_changes',
  description:
    'Triggers when a component status changes on the status page. Polls components periodically and detects transitions between statuses (e.g. operational to partial_outage).'
})
  .input(
    z.object({
      componentId: z.string().describe('ID of the component that changed'),
      previousStatus: z.string().describe('Previous status of the component'),
      newStatus: z.string().describe('New status of the component'),
      component: z.any().describe('Full component data from the API')
    })
  )
  .output(
    z.object({
      componentId: z.string().describe('Unique identifier of the component'),
      name: z.string().describe('Name of the component'),
      previousStatus: z.string().describe('Previous status before the change'),
      currentStatus: z.string().describe('New current status'),
      description: z.string().optional().nullable().describe('Description of the component'),
      groupId: z.string().optional().nullable().describe('Component group ID if grouped'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token, pageId: ctx.config.pageId });
      let previousState = ctx.state as {
        componentStatuses?: Record<string, string>;
        initialized?: boolean;
      } | null;
      let componentStatuses: Record<string, string> = previousState?.componentStatuses || {};

      let components = await client.listComponents();
      let inputs: Array<{
        componentId: string;
        previousStatus: string;
        newStatus: string;
        component: any;
      }> = [];

      for (let component of components) {
        let previousStatus = componentStatuses[component.id];
        let newStatus = component.status;

        if (previousState?.initialized && previousStatus && previousStatus !== newStatus) {
          inputs.push({
            componentId: component.id,
            previousStatus,
            newStatus,
            component
          });
        }

        componentStatuses[component.id] = newStatus;
      }

      return {
        inputs,
        updatedState: {
          componentStatuses,
          initialized: true
        }
      };
    },

    handleEvent: async ctx => {
      let component = ctx.input.component;

      return {
        type: 'component.status_changed',
        id: `${ctx.input.componentId}-${ctx.input.newStatus}-${component.updated_at || Date.now()}`,
        output: {
          componentId: component.id,
          name: component.name,
          previousStatus: ctx.input.previousStatus,
          currentStatus: ctx.input.newStatus,
          description: component.description,
          groupId: component.group_id,
          updatedAt: component.updated_at
        }
      };
    }
  })
  .build();

import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let dashboardChanges = SlateTrigger.create(spec, {
  name: 'Dashboard Changes',
  key: 'dashboard_changes',
  description:
    'Detects new or updated dashboards by polling the dashboards list and comparing against previously seen state.'
})
  .input(
    z.object({
      changeType: z.enum(['created', 'updated']).describe('Type of change detected'),
      dashboardId: z.string().describe('Dashboard ID'),
      name: z.string().describe('Dashboard name'),
      description: z.string().optional().describe('Dashboard description'),
      lastUpdated: z.string().optional().describe('Last update timestamp')
    })
  )
  .output(
    z.object({
      dashboardId: z.string().describe('ID of the dashboard'),
      name: z.string().describe('Name of the dashboard'),
      description: z.string().optional().describe('Description of the dashboard'),
      lastUpdated: z.string().optional().describe('Last update timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let result = await client.listTabs({ limit: 100 });
      let tabs = result?.data || [];

      let previousMap: Record<string, string> = ctx.state?.dashboardMap || {};
      let inputs: Array<{
        changeType: 'created' | 'updated';
        dashboardId: string;
        name: string;
        description?: string;
        lastUpdated?: string;
      }> = [];
      let newMap: Record<string, string> = {};

      for (let tab of tabs) {
        let tabId = tab.id;
        let lastUpdated = tab.last_updated || '';
        newMap[tabId] = lastUpdated;

        if (!previousMap[tabId]) {
          inputs.push({
            changeType: 'created',
            dashboardId: tabId,
            name: tab.name,
            description: tab.description,
            lastUpdated
          });
        } else if (previousMap[tabId] !== lastUpdated) {
          inputs.push({
            changeType: 'updated',
            dashboardId: tabId,
            name: tab.name,
            description: tab.description,
            lastUpdated
          });
        }
      }

      return {
        inputs,
        updatedState: { dashboardMap: newMap }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `dashboard.${ctx.input.changeType}`,
        id: `${ctx.input.dashboardId}-${ctx.input.lastUpdated || ctx.input.changeType}`,
        output: {
          dashboardId: ctx.input.dashboardId,
          name: ctx.input.name,
          description: ctx.input.description,
          lastUpdated: ctx.input.lastUpdated
        }
      };
    }
  })
  .build();

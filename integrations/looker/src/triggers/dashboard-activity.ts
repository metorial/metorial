import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { LookerClient } from '../lib/client';
import { spec } from '../spec';

export let dashboardActivity = SlateTrigger.create(spec, {
  name: 'Dashboard Changes',
  key: 'dashboard_activity',
  description: 'Triggers when dashboards are created or updated in the Looker instance.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated']).describe('Type of dashboard event'),
      dashboardId: z.string().describe('Dashboard ID'),
      title: z.string().optional().describe('Dashboard title'),
      description: z.string().optional().describe('Dashboard description'),
      folderId: z.string().optional().describe('Folder ID'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .output(
    z.object({
      dashboardId: z.string().describe('Dashboard ID'),
      title: z.string().optional().describe('Dashboard title'),
      description: z.string().optional().describe('Dashboard description'),
      folderId: z.string().optional().describe('Folder ID'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new LookerClient({
        instanceUrl: ctx.config.instanceUrl,
        token: ctx.auth.token
      });

      let state = ctx.state || {};
      let lastPolledAt = state.lastPolledAt as string | undefined;

      let dashboards = await client.searchDashboards({
        sorts: 'updated_at desc',
        per_page: 50
      });

      let inputs: Array<{
        eventType: 'created' | 'updated';
        dashboardId: string;
        title?: string;
        description?: string;
        folderId?: string;
        updatedAt?: string;
        createdAt?: string;
      }> = [];

      let knownDashboards = (state.knownDashboards || {}) as Record<string, string>;
      let newKnownDashboards: Record<string, string> = {};

      for (let d of dashboards || []) {
        let id = String(d.id);
        let updatedAt = d.updated_at || d.created_at || '';
        newKnownDashboards[id] = updatedAt;

        if (!lastPolledAt) continue;

        let previousUpdatedAt = knownDashboards[id];

        if (!previousUpdatedAt) {
          inputs.push({
            eventType: 'created',
            dashboardId: id,
            title: d.title,
            description: d.description,
            folderId: d.folder_id ? String(d.folder_id) : undefined,
            updatedAt: d.updated_at,
            createdAt: d.created_at
          });
        } else if (updatedAt !== previousUpdatedAt) {
          inputs.push({
            eventType: 'updated',
            dashboardId: id,
            title: d.title,
            description: d.description,
            folderId: d.folder_id ? String(d.folder_id) : undefined,
            updatedAt: d.updated_at,
            createdAt: d.created_at
          });
        }
      }

      return {
        inputs,
        updatedState: {
          lastPolledAt: new Date().toISOString(),
          knownDashboards: newKnownDashboards
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `dashboard.${ctx.input.eventType}`,
        id: `dashboard-${ctx.input.dashboardId}-${ctx.input.updatedAt || ctx.input.createdAt || Date.now()}`,
        output: {
          dashboardId: ctx.input.dashboardId,
          title: ctx.input.title,
          description: ctx.input.description,
          folderId: ctx.input.folderId,
          updatedAt: ctx.input.updatedAt,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();

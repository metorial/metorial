import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let projectChanges = SlateTrigger.create(spec, {
  name: 'Project Changes',
  key: 'project_changes',
  description: 'Polls for new or updated projects in FreeAgent.'
})
  .input(
    z.object({
      projectId: z.string().describe('FreeAgent project ID'),
      name: z.string().optional().describe('Project name'),
      contact: z.string().optional().describe('Contact URL'),
      status: z.string().optional().describe('Project status'),
      currency: z.string().optional().describe('Currency code'),
      budget: z.string().optional().describe('Budget amount'),
      budgetUnits: z.string().optional().describe('Budget units'),
      updatedAt: z.string().optional().describe('Last updated timestamp'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      raw: z.record(z.string(), z.any()).optional().describe('Full project payload')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('FreeAgent project ID'),
      name: z.string().optional().describe('Project name'),
      contact: z.string().optional().describe('Contact URL'),
      status: z.string().optional().describe('Project status'),
      currency: z.string().optional().describe('Currency code'),
      budget: z.string().optional().describe('Budget amount'),
      budgetUnits: z.string().optional().describe('Budget units'),
      updatedAt: z.string().optional().describe('Last updated timestamp'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new FreeAgentClient({
        token: ctx.auth.token,
        environment: ctx.config.environment
      });

      let lastPolled = ctx.state?.lastPolled as string | undefined;

      // FreeAgent projects list doesn't support updatedSince directly,
      // so we fetch all and let the state-based dedup handle it
      let projects = await client.listProjects({});

      let now = new Date().toISOString();

      let filtered = lastPolled
        ? projects.filter((p: any) => !p.updated_at || p.updated_at > lastPolled)
        : projects;

      let inputs = filtered.map((p: any) => {
        let url = p.url || '';
        let projectId = url.split('/').pop() || '';
        return {
          projectId,
          name: p.name,
          contact: p.contact,
          status: p.status,
          currency: p.currency,
          budget: p.budget != null ? String(p.budget) : undefined,
          budgetUnits: p.budget_units,
          updatedAt: p.updated_at,
          createdAt: p.created_at,
          raw: p
        };
      });

      return {
        inputs,
        updatedState: {
          lastPolled: now
        }
      };
    },

    handleEvent: async ctx => {
      let isNew = ctx.input.createdAt === ctx.input.updatedAt;
      let eventType = isNew ? 'created' : 'updated';

      return {
        type: `project.${eventType}`,
        id: `${ctx.input.projectId}-${ctx.input.updatedAt || Date.now()}`,
        output: {
          projectId: ctx.input.projectId,
          name: ctx.input.name,
          contact: ctx.input.contact,
          status: ctx.input.status,
          currency: ctx.input.currency,
          budget: ctx.input.budget,
          budgetUnits: ctx.input.budgetUnits,
          updatedAt: ctx.input.updatedAt,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();

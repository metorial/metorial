import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { HarvestClient } from '../lib/client';
import { spec } from '../spec';

export let projectChanges = SlateTrigger.create(spec, {
  name: 'Project Changes',
  key: 'project_changes',
  description:
    'Triggers when projects are created or updated in Harvest. Polls for changes since the last check.'
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the project'),
      updatedAt: z.string().describe('When the project was last updated'),
      createdAt: z.string().describe('When the project was created'),
      isNew: z.boolean().describe('Whether this is a newly created project'),
      project: z.any().describe('Full project data from the API')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('ID of the project'),
      name: z.string().describe('Project name'),
      code: z.string().nullable().describe('Project code'),
      clientId: z.number().optional().describe('Client ID'),
      clientName: z.string().optional().describe('Client name'),
      isActive: z.boolean().describe('Whether active'),
      isBillable: z.boolean().describe('Whether billable'),
      billBy: z.string().describe('Billing method'),
      budgetBy: z.string().describe('Budget method'),
      budget: z.number().nullable().describe('Budget amount'),
      startsOn: z.string().nullable().describe('Start date'),
      endsOn: z.string().nullable().describe('End date'),
      createdAt: z.string().describe('Created timestamp'),
      updatedAt: z.string().describe('Updated timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new HarvestClient({
        token: ctx.auth.token,
        accountId: ctx.config.accountId
      });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;
      let knownIds = (ctx.state?.knownIds as number[]) ?? [];

      let params: any = {
        perPage: 100
      };
      if (lastPollTime) {
        params.updatedSince = lastPollTime;
      }

      let result = await client.listProjects(params);
      let projects = result.results;

      let page = 2;
      while (result.nextPage) {
        result = await client.listProjects({ ...params, page });
        projects = projects.concat(result.results);
        page++;
      }

      let newPollTime = new Date().toISOString();

      let inputs = projects.map((p: any) => ({
        projectId: p.id,
        updatedAt: p.updated_at,
        createdAt: p.created_at,
        isNew: !knownIds.includes(p.id),
        project: p
      }));

      let updatedKnownIds = [
        ...new Set([...knownIds, ...projects.map((p: any) => p.id)])
      ].slice(-10000);

      return {
        inputs,
        updatedState: {
          lastPollTime: newPollTime,
          knownIds: updatedKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.project;
      let eventType = ctx.input.isNew ? 'created' : 'updated';

      return {
        type: `project.${eventType}`,
        id: `${p.id}-${p.updated_at}`,
        output: {
          projectId: p.id,
          name: p.name,
          code: p.code,
          clientId: p.client?.id,
          clientName: p.client?.name,
          isActive: p.is_active,
          isBillable: p.is_billable,
          billBy: p.bill_by,
          budgetBy: p.budget_by,
          budget: p.budget,
          startsOn: p.starts_on,
          endsOn: p.ends_on,
          createdAt: p.created_at,
          updatedAt: p.updated_at
        }
      };
    }
  })
  .build();

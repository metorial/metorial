import { SlateTool } from 'slates';
import { z } from 'zod';
import { MakeClient } from '../lib/client';
import { spec } from '../spec';

export let listScenarios = SlateTool.create(spec, {
  name: 'List Scenarios',
  key: 'list_scenarios',
  description: `Retrieve a list of automation scenarios from Make. Filter by team, organization, folder, or active status. Returns scenario names, IDs, scheduling details, and current state.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.number().optional().describe('Filter scenarios by team ID'),
      organizationId: z.number().optional().describe('Filter scenarios by organization ID'),
      folderId: z.number().optional().describe('Filter scenarios by folder ID'),
      isActive: z.boolean().optional().describe('Filter by active/inactive status'),
      limit: z.number().optional().describe('Maximum number of scenarios to return'),
      offset: z.number().optional().describe('Number of scenarios to skip for pagination')
    })
  )
  .output(
    z.object({
      scenarios: z.array(
        z.object({
          scenarioId: z.number().describe('Unique scenario identifier'),
          name: z.string().describe('Scenario name'),
          teamId: z.number().optional().describe('Team the scenario belongs to'),
          isActive: z
            .boolean()
            .optional()
            .describe('Whether the scenario is currently active'),
          isPaused: z.boolean().optional().describe('Whether the scenario is paused'),
          createdAt: z.string().optional().describe('When the scenario was created'),
          updatedAt: z.string().optional().describe('When the scenario was last updated'),
          nextExec: z.string().optional().describe('Next scheduled execution time'),
          description: z.string().optional().describe('Scenario description')
        })
      ),
      total: z.number().optional().describe('Total number of matching scenarios')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MakeClient({
      token: ctx.auth.token,
      zoneUrl: ctx.config.zoneUrl
    });

    let result = await client.listScenarios({
      teamId: ctx.input.teamId,
      organizationId: ctx.input.organizationId,
      folderId: ctx.input.folderId,
      isActive: ctx.input.isActive,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let scenarios = (result.scenarios ?? result ?? []).map((s: any) => ({
      scenarioId: s.id,
      name: s.name,
      teamId: s.teamId,
      isActive: s.islinked ?? s.isActive,
      isPaused: s.isPaused,
      createdAt: s.created,
      updatedAt: s.updated,
      nextExec: s.nextExec,
      description: s.description
    }));

    return {
      output: {
        scenarios,
        total: result.pg?.total
      },
      message: `Found **${scenarios.length}** scenario(s)${ctx.input.teamId ? ` in team ${ctx.input.teamId}` : ''}.`
    };
  })
  .build();

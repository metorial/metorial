import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { paging, scenarioOutput } from '../lib/schemas';
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
      teamId: z
        .number()
        .optional()
        .describe('Team ID from list_teams; provide exactly one teamId or organizationId'),
      organizationId: z
        .number()
        .optional()
        .describe('Organization ID from list_organizations; provide exactly one container'),
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
      page: paging.optional(),
      total: z.number().optional().describe('Total number of matching scenarios')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);
    const result = await client.listScenarios(ctx.input);
    const scenarios = result.scenarios.map(scenarioOutput);
    return {
      output: { scenarios, page: result.pg },
      message: `Returned ${scenarios.length} scenarios in this page.`
    };
  })
  .build();

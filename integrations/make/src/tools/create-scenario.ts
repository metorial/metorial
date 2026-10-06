import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { scenarioOutput } from '../lib/schemas';
import { spec } from '../spec';

export let createScenario = SlateTool.create(spec, {
  name: 'Create Scenario',
  key: 'create_scenario',
  description: `Create a new automation scenario in a Make team. Provide blueprint JSON text and an explicit scheduling object. These legacy optional fields are required at runtime by the native API. Creation does not confirm activation or execution.`
})
  .input(
    z.object({
      confirmed: z
        .boolean()
        .optional()
        .describe(
          'Explicitly acknowledge the provider confirmation for referenced resources or app installation; omission does not bypass it.'
        ),
      teamId: z
        .number()
        .describe(
          'Team ID; call list_teams after list_organizations to discover authorized IDs. to create the scenario in'
        ),
      name: z.string().optional().describe('Name for the new scenario'),
      blueprint: z
        .string()
        .optional()
        .describe('Blueprint JSON string defining the scenario modules and flow'),
      scheduling: z
        .record(z.string(), z.any())
        .optional()
        .describe('Scheduling configuration for the scenario'),
      folderId: z.number().optional().describe('Folder ID to place the scenario in')
    })
  )
  .output(
    z.object({
      scenarioId: z.number().describe('ID of the created scenario'),
      name: z.string().optional().describe('Name of the created scenario'),
      teamId: z
        .number()
        .optional()
        .describe(
          'Team ID; call list_teams after list_organizations to discover authorized IDs.'
        ),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);
    const result = await client.createScenario(ctx.input);
    return {
      output: scenarioOutput(result.scenario),
      message: `Created scenario ${result.scenario.id}. Creation does not confirm execution; inspect its scheduling and active state before activating it.`
    };
  })
  .build();

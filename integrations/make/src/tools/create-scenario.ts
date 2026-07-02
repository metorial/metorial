import { SlateTool } from 'slates';
import { z } from 'zod';
import { MakeClient } from '../lib/client';
import { spec } from '../spec';

export let createScenario = SlateTool.create(spec, {
  name: 'Create Scenario',
  key: 'create_scenario',
  description: `Create a new automation scenario in a Make team. Optionally provide a blueprint JSON definition, scheduling configuration, and folder assignment.`
})
  .input(
    z.object({
      teamId: z.number().describe('Team ID to create the scenario in'),
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
      teamId: z.number().optional().describe('Team ID'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MakeClient({
      token: ctx.auth.token,
      zoneUrl: ctx.config.zoneUrl
    });

    let result = await client.createScenario({
      teamId: ctx.input.teamId,
      name: ctx.input.name,
      blueprint: ctx.input.blueprint,
      scheduling: ctx.input.scheduling,
      folderId: ctx.input.folderId
    });

    let s = result.scenario ?? result;

    return {
      output: {
        scenarioId: s.id,
        name: s.name,
        teamId: s.teamId,
        createdAt: s.created
      },
      message: `Created scenario **${s.name ?? s.id}** in team ${ctx.input.teamId}.`
    };
  })
  .build();

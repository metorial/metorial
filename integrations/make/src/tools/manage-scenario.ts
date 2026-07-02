import { SlateTool } from 'slates';
import { z } from 'zod';
import { MakeClient } from '../lib/client';
import { spec } from '../spec';

export let manageScenario = SlateTool.create(spec, {
  name: 'Manage Scenario',
  key: 'manage_scenario',
  description: `Get details, update, activate, deactivate, run, clone, or delete an automation scenario. Supports one-off execution, cloning to another team, and retrieving blueprint or usage information.`,
  instructions: [
    'Provide a scenarioId and an action to perform.',
    'Use "get" to fetch details, "activate"/"deactivate" to toggle status, "run" for on-demand execution, "clone" to copy to another team, or "delete" to remove.',
    'For "update", supply the fields you want to change (name, scheduling, folderId).'
  ]
})
  .input(
    z.object({
      scenarioId: z.number().describe('ID of the scenario to manage'),
      action: z
        .enum([
          'get',
          'update',
          'activate',
          'deactivate',
          'run',
          'clone',
          'delete',
          'get_blueprint',
          'get_usage'
        ])
        .describe('Action to perform on the scenario'),
      name: z.string().optional().describe('New name (for update action)'),
      scheduling: z
        .record(z.string(), z.any())
        .optional()
        .describe('Scheduling configuration (for update action)'),
      folderId: z
        .number()
        .optional()
        .describe('Folder ID to move scenario into (for update action)'),
      targetTeamId: z
        .number()
        .optional()
        .describe('Target team ID (required for clone action)'),
      cloneName: z.string().optional().describe('Name for the cloned scenario')
    })
  )
  .output(
    z.object({
      scenarioId: z.number().optional().describe('Scenario ID'),
      name: z.string().optional().describe('Scenario name'),
      teamId: z.number().optional().describe('Team ID'),
      isActive: z.boolean().optional().describe('Whether the scenario is active'),
      createdAt: z.string().optional().describe('Creation time'),
      updatedAt: z.string().optional().describe('Last update time'),
      blueprint: z
        .any()
        .optional()
        .describe('Scenario blueprint JSON (for get_blueprint action)'),
      usage: z.any().optional().describe('Scenario usage data (for get_usage action)'),
      executionId: z.string().optional().describe('Execution ID (for run action)'),
      deleted: z.boolean().optional().describe('Whether the scenario was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MakeClient({
      token: ctx.auth.token,
      zoneUrl: ctx.config.zoneUrl
    });

    let { scenarioId, action } = ctx.input;

    if (action === 'get') {
      let result = await client.getScenario(scenarioId);
      let s = result.scenario ?? result;
      return {
        output: {
          scenarioId: s.id,
          name: s.name,
          teamId: s.teamId,
          isActive: s.islinked ?? s.isActive,
          createdAt: s.created,
          updatedAt: s.updated
        },
        message: `Scenario **${s.name}** (ID: ${s.id}) — ${s.islinked || s.isActive ? 'Active' : 'Inactive'}.`
      };
    }

    if (action === 'update') {
      let updateData: Record<string, any> = {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.scheduling !== undefined) updateData.scheduling = ctx.input.scheduling;
      if (ctx.input.folderId !== undefined) updateData.folderId = ctx.input.folderId;

      let result = await client.updateScenario(scenarioId, updateData);
      let s = result.scenario ?? result;
      return {
        output: {
          scenarioId: s.id,
          name: s.name,
          teamId: s.teamId,
          isActive: s.islinked ?? s.isActive,
          updatedAt: s.updated
        },
        message: `Scenario **${s.name}** updated successfully.`
      };
    }

    if (action === 'activate') {
      let result = await client.activateScenario(scenarioId);
      let s = result.scenario ?? result;
      return {
        output: {
          scenarioId: s.id ?? scenarioId,
          name: s.name,
          isActive: true
        },
        message: `Scenario ${scenarioId} **activated**.`
      };
    }

    if (action === 'deactivate') {
      let result = await client.deactivateScenario(scenarioId);
      let s = result.scenario ?? result;
      return {
        output: {
          scenarioId: s.id ?? scenarioId,
          name: s.name,
          isActive: false
        },
        message: `Scenario ${scenarioId} **deactivated**.`
      };
    }

    if (action === 'run') {
      let result = await client.runScenario(scenarioId);
      return {
        output: {
          scenarioId,
          executionId: result.executionId ?? String(result.id ?? '')
        },
        message: `Scenario ${scenarioId} executed. Execution ID: ${result.executionId ?? result.id ?? 'N/A'}.`
      };
    }

    if (action === 'clone') {
      if (!ctx.input.targetTeamId) {
        throw new Error('targetTeamId is required for clone action');
      }
      let result = await client.cloneScenario(scenarioId, {
        targetTeamId: ctx.input.targetTeamId,
        name: ctx.input.cloneName
      });
      let s = result.scenario ?? result;
      return {
        output: {
          scenarioId: s.id,
          name: s.name,
          teamId: s.teamId
        },
        message: `Scenario cloned as **${s.name}** (ID: ${s.id}) to team ${ctx.input.targetTeamId}.`
      };
    }

    if (action === 'get_blueprint') {
      let result = await client.getScenarioBlueprint(scenarioId);
      return {
        output: {
          scenarioId,
          blueprint: result.response?.blueprint ?? result.blueprint ?? result
        },
        message: `Retrieved blueprint for scenario ${scenarioId}.`
      };
    }

    if (action === 'get_usage') {
      let result = await client.getScenarioUsage(scenarioId);
      return {
        output: {
          scenarioId,
          usage: result
        },
        message: `Retrieved usage statistics for scenario ${scenarioId}.`
      };
    }

    if (action === 'delete') {
      await client.deleteScenario(scenarioId);
      return {
        output: {
          scenarioId,
          deleted: true
        },
        message: `Scenario ${scenarioId} **deleted**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();

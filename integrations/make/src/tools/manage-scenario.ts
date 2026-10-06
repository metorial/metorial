import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { scenarioOutput } from '../lib/schemas';
import { spec } from '../spec';

export let manageScenario = SlateTool.create(spec, {
  name: 'Manage Scenario',
  key: 'manage_scenario',
  description: `Get details, update, activate, deactivate, run, clone, or delete an automation scenario. Run is asynchronous and can cause external effects or charges; activation can immediately execute interval schedules. Clone requires target organization, team, name, and an explicit module-state choice. Delete can retain a recoverable trash entry and history.`,
  instructions: [
    'Provide a scenarioId and an action to perform.',
    'Use "get" to fetch details, "activate"/"deactivate" to toggle status, "run" for on-demand execution, "clone" to copy to another team, or "delete" to remove.',
    'For "update", supply the fields you want to change (name, scheduling, folderId).'
  ]
})
  .input(
    z.object({
      organizationId: z
        .number()
        .optional()
        .describe('Target organization ID from list_organizations; required for clone.'),
      cloneStates: z
        .boolean()
        .optional()
        .describe('Required for clone: true copies module state; false resets it.'),
      cloneMappings: z
        .record(z.string(), z.record(z.string(), z.unknown()))
        .optional()
        .describe(
          'Documented account/key/hook/device/udt/datastore ID maps for cross-team clones.'
        ),
      runData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Native scenario inputs for an asynchronous run. Running can cause external actions and charges; never resend an uncertain run.'
        ),
      confirmed: z
        .boolean()
        .optional()
        .describe(
          'Explicitly acknowledge the provider confirmation for referenced resources or app installation; omission does not bypass it.'
        ),
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
      teamId: z
        .number()
        .optional()
        .describe(
          'Team ID; call list_teams after list_organizations to discover authorized IDs.'
        ),
      isActive: z.boolean().optional().describe('Whether the scenario is active'),
      createdAt: z.string().optional().describe('Creation time'),
      updatedAt: z.string().optional().describe('Last update time'),
      blueprint: z
        .any()
        .optional()
        .describe('Scenario blueprint JSON (for get_blueprint action)'),
      usage: z.any().optional().describe('Scenario usage data (for get_usage action)'),
      executionStatus: z
        .string()
        .optional()
        .describe('Native immediate execution status, if returned.'),
      executionId: z.string().optional().describe('Execution ID (for run action)'),
      deleted: z.boolean().optional().describe('Whether the scenario was deleted')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);
    const { action, scenarioId } = ctx.input;
    if (action === 'get')
      return {
        output: scenarioOutput((await client.getScenario(scenarioId)).scenario),
        message: 'Retrieved the exact scenario.'
      };
    if (action === 'update')
      return {
        output: scenarioOutput((await client.updateScenario(scenarioId, ctx.input)).scenario),
        message: 'The native scenario update receipt was confirmed.'
      };
    if (action === 'activate' || action === 'deactivate') {
      const result =
        action === 'activate'
          ? await client.activateScenario(scenarioId)
          : await client.deactivateScenario(scenarioId);
      return {
        output: { scenarioId: result.scenario.id, isActive: result.scenario.isActive },
        message:
          action === 'activate'
            ? 'Scenario activated. Interval schedules can execute immediately and cause external actions or charges.'
            : 'Scenario deactivated/stopped. Previously completed actions and execution history remain.'
      };
    }
    if (action === 'run') {
      const result = await client.runScenario(scenarioId, ctx.input.runData);
      return {
        output: {
          scenarioId,
          executionId: result.executionId,
          executionStatus: result.status
        },
        message: `Execution ${result.executionId} was accepted asynchronously. Call get_execution_status; completion is not confirmed. Do not resend an uncertain execution.`
      };
    }
    if (action === 'clone') {
      const result = await client.cloneScenario(scenarioId, {
        targetTeamId: ctx.input.targetTeamId,
        organizationId: ctx.input.organizationId,
        name: ctx.input.cloneName,
        states: ctx.input.cloneStates,
        confirmed: ctx.input.confirmed,
        mappings: ctx.input.cloneMappings
      });
      return {
        output: scenarioOutput(result.scenario),
        message:
          'Created the native scenario clone. Review referenced connections, module states, scheduling, and active status before activation.'
      };
    }
    if (action === 'get_blueprint') {
      const result = await client.getScenarioBlueprint(scenarioId);
      return {
        output: { scenarioId, blueprint: result.response.blueprint },
        message: 'Retrieved the existing scenario blueprint configuration.'
      };
    }
    if (action === 'get_usage') {
      const usage = await client.getScenarioUsage(scenarioId);
      return {
        output: { scenarioId, usage },
        message: 'Retrieved native daily scenario usage for the past 30 days.'
      };
    }
    await client.deleteScenario(scenarioId);
    return {
      output: { scenarioId, deleted: true },
      message:
        'Make acknowledged scenario deletion. With scenario trash enabled this stops the scenario and retains it for a 30-day recovery window; history and prior external effects are not erased.'
    };
  })
  .build();

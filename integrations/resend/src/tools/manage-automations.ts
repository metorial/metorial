import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let automationStepSchema = z.object({
  key: z.string().describe('Unique key for this automation step.'),
  type: z.string().describe('Resend automation step type, such as trigger or send_email.'),
  config: z
    .record(z.string(), z.any())
    .optional()
    .describe('Provider-specific step configuration.')
});

let automationConnectionSchema = z.object({
  from: z.string().describe('Source step key.'),
  to: z.string().describe('Destination step key.')
});

let automationOutputSchema = z.object({
  automationId: z.string().describe('Automation ID.'),
  name: z.string().optional().describe('Automation name.'),
  status: z.string().optional().describe('Automation status.'),
  steps: z.array(automationStepSchema).optional().describe('Automation graph steps.'),
  connections: z
    .array(automationConnectionSchema)
    .optional()
    .describe('Automation graph connections.'),
  createdAt: z.string().optional().describe('Creation timestamp.')
});

let automationRunOutputSchema = z.object({
  runId: z.string().describe('Automation run ID.'),
  status: z.string().optional().describe('Run status.'),
  startedAt: z.string().optional().nullable().describe('Run start timestamp.'),
  completedAt: z.string().optional().nullable().describe('Run completion timestamp.'),
  createdAt: z.string().optional().describe('Creation timestamp.'),
  data: z.any().optional().describe('Provider-specific run payload.')
});

let mapAutomation = (automation: any) => ({
  automationId: automation.id,
  name: automation.name,
  status: automation.status,
  steps: automation.steps,
  connections: automation.connections,
  createdAt: automation.created_at
});

let mapAutomationRun = (run: any) => ({
  runId: run.id,
  status: run.status,
  startedAt: run.started_at,
  completedAt: run.completed_at,
  createdAt: run.created_at,
  data: run
});

export let createAutomation = SlateTool.create(spec, {
  name: 'Create Automation',
  key: 'create_automation',
  description: `Create a Resend automation graph for email sequences. New automations default to disabled unless status is enabled.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Automation name.'),
      status: z.enum(['enabled', 'disabled']).optional().describe('Automation status.'),
      steps: z
        .array(automationStepSchema)
        .optional()
        .describe('Automation steps. Must be provided together with connections.'),
      connections: z
        .array(automationConnectionSchema)
        .optional()
        .describe('Automation step connections. Must be provided together with steps.')
    })
  )
  .output(
    z.object({
      automationId: z.string().describe('ID of the created automation.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createAutomation({
      name: ctx.input.name,
      status: ctx.input.status,
      steps: ctx.input.steps,
      connections: ctx.input.connections
    });

    return {
      output: { automationId: result.id },
      message: `Automation **${ctx.input.name}** created with ID \`${result.id}\`.`
    };
  })
  .build();

export let getAutomation = SlateTool.create(spec, {
  name: 'Get Automation',
  key: 'get_automation',
  description: `Retrieve a Resend automation by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      automationId: z.string().describe('Automation ID.')
    })
  )
  .output(automationOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let automation = await client.getAutomation(ctx.input.automationId);

    return {
      output: mapAutomation(automation),
      message: `Automation **${automation.name ?? automation.id}** retrieved.`
    };
  })
  .build();

export let updateAutomation = SlateTool.create(spec, {
  name: 'Update Automation',
  key: 'update_automation',
  description: `Update a Resend automation name, status, steps, or connections.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      automationId: z.string().describe('Automation ID.'),
      name: z.string().optional().describe('Updated automation name.'),
      status: z
        .enum(['enabled', 'disabled'])
        .optional()
        .describe('Updated automation status.'),
      steps: z.array(automationStepSchema).optional().describe('Updated automation steps.'),
      connections: z
        .array(automationConnectionSchema)
        .optional()
        .describe('Updated automation step connections.')
    })
  )
  .output(
    z.object({
      automationId: z.string().describe('ID of the updated automation.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateAutomation(ctx.input.automationId, {
      name: ctx.input.name,
      status: ctx.input.status,
      steps: ctx.input.steps,
      connections: ctx.input.connections
    });

    return {
      output: { automationId: result.id },
      message: `Automation \`${result.id}\` updated.`
    };
  })
  .build();

export let listAutomations = SlateTool.create(spec, {
  name: 'List Automations',
  key: 'list_automations',
  description: `List Resend automations configured for the authenticated team.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max results (default 20, max 100).'),
      after: z.string().optional().describe('Cursor for forward pagination.'),
      before: z.string().optional().describe('Cursor for backward pagination.')
    })
  )
  .output(
    z.object({
      automations: z.array(automationOutputSchema).describe('Configured automations.'),
      hasMore: z.boolean().describe('Whether more results are available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listAutomations({
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });
    let automations = (result.data || []).map(mapAutomation);

    return {
      output: {
        automations,
        hasMore: result.has_more ?? false
      },
      message: `Found **${automations.length}** automation(s).`
    };
  })
  .build();

export let stopAutomation = SlateTool.create(spec, {
  name: 'Stop Automation',
  key: 'stop_automation',
  description: `Stop a running Resend automation by disabling it.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      automationId: z.string().describe('Automation ID.')
    })
  )
  .output(
    z.object({
      automationId: z.string().describe('Stopped automation ID.'),
      status: z.string().optional().describe('Automation status after stopping.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.stopAutomation(ctx.input.automationId);

    return {
      output: {
        automationId: result.id,
        status: result.status
      },
      message: `Automation \`${result.id}\` stopped.`
    };
  })
  .build();

export let deleteAutomation = SlateTool.create(spec, {
  name: 'Delete Automation',
  key: 'delete_automation',
  description: `Delete a Resend automation.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      automationId: z.string().describe('Automation ID.')
    })
  )
  .output(
    z.object({
      automationId: z.string().describe('Deleted automation ID.'),
      deleted: z.boolean().describe('Whether the automation was deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteAutomation(ctx.input.automationId);

    return {
      output: {
        automationId: result.id,
        deleted: result.deleted ?? true
      },
      message: `Automation \`${result.id}\` has been **deleted**.`
    };
  })
  .build();

export let listAutomationRuns = SlateTool.create(spec, {
  name: 'List Automation Runs',
  key: 'list_automation_runs',
  description: `List runs for a Resend automation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      automationId: z.string().describe('Automation ID.'),
      status: z.string().optional().describe('Optional run status filter.'),
      limit: z.number().optional().describe('Max results (default 20, max 100).'),
      after: z.string().optional().describe('Cursor for forward pagination.'),
      before: z.string().optional().describe('Cursor for backward pagination.')
    })
  )
  .output(
    z.object({
      runs: z.array(automationRunOutputSchema).describe('Automation runs.'),
      hasMore: z.boolean().describe('Whether more results are available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listAutomationRuns(ctx.input.automationId, {
      status: ctx.input.status,
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });
    let runs = (result.data || []).map(mapAutomationRun);

    return {
      output: {
        runs,
        hasMore: result.has_more ?? false
      },
      message: `Found **${runs.length}** automation run(s).`
    };
  })
  .build();

export let getAutomationRun = SlateTool.create(spec, {
  name: 'Get Automation Run',
  key: 'get_automation_run',
  description: `Retrieve one run for a Resend automation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      automationId: z.string().describe('Automation ID.'),
      runId: z.string().describe('Automation run ID.')
    })
  )
  .output(automationRunOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let run = await client.getAutomationRun(ctx.input.automationId, ctx.input.runId);

    return {
      output: mapAutomationRun(run),
      message: `Automation run \`${run.id}\` retrieved.`
    };
  })
  .build();

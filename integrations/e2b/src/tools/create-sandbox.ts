import { SlateTool } from 'slates';
import { z } from 'zod';
import { E2BClient } from '../lib/client';
import { spec } from '../spec';

export let createSandbox = SlateTool.create(spec, {
  name: 'Create Sandbox',
  key: 'create_sandbox',
  description: `Create a new E2B cloud sandbox environment. Sandboxes are lightweight, secure Linux VMs for executing code in isolation.
You can specify a custom template, set a timeout, configure auto-pause behavior, and attach metadata or environment variables.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z
        .string()
        .optional()
        .describe(
          'Template ID or alias to create the sandbox from. Uses the default base template if not specified.'
        ),
      timeout: z
        .number()
        .optional()
        .describe(
          'Sandbox timeout in seconds. After this period the sandbox is killed (or paused if autoPause is enabled). Max 86400 (24h) for Pro, 3600 (1h) for Hobby.'
        ),
      autoPause: z
        .boolean()
        .optional()
        .describe(
          'If true, the sandbox will be paused instead of killed when the timeout expires.'
        ),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value metadata to attach to the sandbox.'),
      envVars: z
        .record(z.string(), z.string())
        .optional()
        .describe('Environment variables to set inside the sandbox.')
    })
  )
  .output(
    z.object({
      sandboxId: z.string().describe('Unique identifier of the created sandbox.'),
      templateId: z.string().describe('Template ID used to create the sandbox.'),
      name: z.string().describe('Name or alias of the template.'),
      clientId: z.string().describe('Client identifier for the sandbox.'),
      startedAt: z.string().describe('ISO 8601 timestamp when the sandbox started.'),
      endAt: z
        .string()
        .describe('ISO 8601 timestamp when the sandbox is scheduled to expire.'),
      cpuCount: z.number().optional().describe('Number of vCPUs allocated.'),
      memoryMb: z.number().optional().describe('Memory allocated in megabytes.'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Metadata attached to the sandbox.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new E2BClient({ token: ctx.auth.token });

    ctx.progress('Creating sandbox...');
    let sandbox = await client.createSandbox({
      templateId: ctx.input.templateId,
      timeout: ctx.input.timeout,
      autoPause: ctx.input.autoPause,
      metadata: ctx.input.metadata,
      envVars: ctx.input.envVars
    });

    return {
      output: {
        sandboxId: sandbox.sandboxId,
        templateId: sandbox.templateId,
        name: sandbox.name,
        clientId: sandbox.clientId,
        startedAt: sandbox.startedAt,
        endAt: sandbox.endAt,
        cpuCount: sandbox.cpuCount,
        memoryMb: sandbox.memoryMb,
        metadata: sandbox.metadata
      },
      message: `Created sandbox **${sandbox.sandboxId}** from template \`${sandbox.templateId || 'default'}\`. Expires at ${sandbox.endAt || 'N/A'}.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { E2BClient } from '../lib/client';
import { spec } from '../spec';

export let resumeSandbox = SlateTool.create(spec, {
  name: 'Resume Sandbox',
  key: 'resume_sandbox',
  description: `Resume a paused sandbox, restoring it to its previous state including filesystem, memory, and running processes. Optionally set a new timeout for the resumed sandbox.`,
  constraints: ['Resuming takes approximately 1 second.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sandboxId: z.string().describe('The unique identifier of the paused sandbox to resume.'),
      timeout: z
        .number()
        .optional()
        .describe(
          'New timeout in seconds for the resumed sandbox. Defaults to 300 seconds (5 minutes).'
        )
    })
  )
  .output(
    z.object({
      sandboxId: z.string().describe('Unique identifier of the resumed sandbox.'),
      templateId: z.string().describe('Template ID of the sandbox.'),
      name: z.string().describe('Name or alias of the template.'),
      clientId: z.string().describe('Client identifier.'),
      startedAt: z.string().describe('ISO 8601 timestamp when the sandbox started.'),
      endAt: z.string().describe('ISO 8601 timestamp when the sandbox will expire.'),
      cpuCount: z.number().optional().describe('Number of vCPUs allocated.'),
      memoryMb: z.number().optional().describe('Memory allocated in megabytes.'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Metadata attached to the sandbox.'),
      state: z.string().optional().describe('Current state of the sandbox.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new E2BClient({ token: ctx.auth.token });

    ctx.progress('Resuming sandbox...');
    let sandbox = await client.resumeSandbox(ctx.input.sandboxId, ctx.input.timeout);

    return {
      output: sandbox,
      message: `Sandbox **${sandbox.sandboxId}** has been resumed. Expires at ${sandbox.endAt || 'N/A'}.`
    };
  })
  .build();

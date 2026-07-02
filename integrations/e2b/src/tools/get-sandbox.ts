import { SlateTool } from 'slates';
import { z } from 'zod';
import { E2BClient } from '../lib/client';
import { spec } from '../spec';

export let getSandbox = SlateTool.create(spec, {
  name: 'Get Sandbox',
  key: 'get_sandbox',
  description: `Retrieve detailed information about a specific sandbox by its ID, including its state, resource allocation, template, timeout, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sandboxId: z.string().describe('The unique identifier of the sandbox to retrieve.')
    })
  )
  .output(
    z.object({
      sandboxId: z.string().describe('Unique identifier of the sandbox.'),
      templateId: z.string().describe('Template ID used to create the sandbox.'),
      name: z.string().describe('Name or alias of the template.'),
      clientId: z.string().describe('Client identifier.'),
      startedAt: z.string().describe('ISO 8601 timestamp when the sandbox started.'),
      endAt: z.string().describe('ISO 8601 timestamp when the sandbox expires.'),
      cpuCount: z.number().optional().describe('Number of vCPUs allocated.'),
      memoryMb: z.number().optional().describe('Memory allocated in megabytes.'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Metadata attached to the sandbox.'),
      state: z.string().optional().describe('Current state of the sandbox (running, paused).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new E2BClient({ token: ctx.auth.token });

    ctx.progress('Fetching sandbox details...');
    let sandbox = await client.getSandbox(ctx.input.sandboxId);

    return {
      output: sandbox,
      message: `Sandbox **${sandbox.sandboxId}** is **${sandbox.state || 'running'}** (template: \`${sandbox.templateId}\`, expires: ${sandbox.endAt || 'N/A'}).`
    };
  })
  .build();

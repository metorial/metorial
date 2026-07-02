import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let triggerDeployment = SlateTool.create(spec, {
  name: 'Trigger Deployment',
  key: 'trigger_deployment',
  description: `Trigger a Pulumi deployment operation on a stack. Supports **update**, **preview**, **refresh**, and **destroy** operations. Deployment settings configured on the stack are inherited by default.`,
  instructions: [
    'The stack must have deployment settings configured (source context, etc.) for the deployment to succeed.',
    "Use inheritSettings=true (default) to use the stack's existing deployment configuration."
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      organization: z
        .string()
        .optional()
        .describe('Organization name (uses default from config if not set)'),
      projectName: z.string().describe('Project name'),
      stackName: z.string().describe('Stack name'),
      operation: z
        .enum(['update', 'preview', 'refresh', 'destroy'])
        .describe('Deployment operation to execute'),
      inheritSettings: z
        .boolean()
        .optional()
        .default(true)
        .describe('Inherit deployment settings configured on the stack')
    })
  )
  .output(
    z.object({
      deploymentId: z.string().optional(),
      version: z.number().optional(),
      status: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let org = ctx.input.organization || ctx.config.organization;
    if (!org)
      throw new Error('Organization is required. Set it in config or provide it as input.');

    let result = await client.createDeployment(
      org,
      ctx.input.projectName,
      ctx.input.stackName,
      {
        operation: ctx.input.operation,
        inheritSettings: ctx.input.inheritSettings
      }
    );

    return {
      output: {
        deploymentId: result.id,
        version: result.version,
        status: result.status
      },
      message: `Triggered **${ctx.input.operation}** deployment on stack **${org}/${ctx.input.projectName}/${ctx.input.stackName}**${result.id ? ` (deployment ID: ${result.id})` : ''}`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createStack = SlateTool.create(spec, {
  name: 'Create Stack',
  key: 'create_stack',
  description: `Create a new Pulumi stack within a project. The project will be created automatically if it does not exist.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      organization: z
        .string()
        .optional()
        .describe('Organization name (uses default from config if not set)'),
      projectName: z.string().describe('Project name (will be created if it does not exist)'),
      stackName: z.string().describe('Name for the new stack')
    })
  )
  .output(
    z.object({
      organizationName: z.string(),
      projectName: z.string(),
      stackName: z.string()
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

    await client.createStack(org, ctx.input.projectName, ctx.input.stackName);

    return {
      output: {
        organizationName: org,
        projectName: ctx.input.projectName,
        stackName: ctx.input.stackName
      },
      message: `Created stack **${org}/${ctx.input.projectName}/${ctx.input.stackName}**`
    };
  })
  .build();

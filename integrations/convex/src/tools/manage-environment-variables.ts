import { SlateTool } from 'slates';
import { z } from 'zod';
import { ConvexClient } from '../lib/client';
import { spec } from '../spec';

export let manageEnvironmentVariables = SlateTool.create(spec, {
  name: 'Manage Environment Variables',
  key: 'manage_environment_variables',
  description: `View or update environment variables for a Convex deployment.
When no changes are provided, lists all current environment variables.
When changes are provided, updates the specified environment variables.
Requires deploy key authentication.`,
  instructions: [
    'To list variables, call without the "changes" parameter',
    'To set or update variables, provide an array of name/value pairs in "changes"'
  ],
  constraints: ['Requires deploy key (admin) authentication'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      changes: z
        .array(
          z.object({
            name: z.string().describe('Environment variable name'),
            value: z.string().describe('Environment variable value')
          })
        )
        .optional()
        .describe('Environment variables to set or update. Omit to list current variables.')
    })
  )
  .output(
    z.object({
      variables: z
        .array(
          z.object({
            name: z.string().describe('Environment variable name'),
            value: z.string().describe('Environment variable value')
          })
        )
        .optional()
        .describe('Current environment variables (when listing)'),
      updated: z.boolean().describe('Whether variables were updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ConvexClient({
      deploymentUrl: ctx.config.deploymentUrl,
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    if (ctx.input.changes && ctx.input.changes.length > 0) {
      ctx.progress('Updating environment variables...');
      await client.updateEnvironmentVariables(ctx.input.changes);

      let names = ctx.input.changes.map(c => `\`${c.name}\``).join(', ');
      return {
        output: {
          updated: true
        },
        message: `Updated environment variables: ${names}.`
      };
    }

    ctx.progress('Fetching environment variables...');
    let variables = await client.getEnvironmentVariables();

    return {
      output: {
        variables,
        updated: false
      },
      message: `Found **${variables.length}** environment variable(s).`
    };
  })
  .build();

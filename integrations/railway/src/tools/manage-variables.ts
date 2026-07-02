import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { railwayServiceError } from '../lib/errors';
import { spec } from '../spec';

export let getVariablesTool = SlateTool.create(spec, {
  name: 'Get Variables',
  key: 'get_variables',
  description: `Retrieve environment variables for a project and environment. Optionally filter by service to get service-specific variables. Returns the rendered (resolved) variable values.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      environmentId: z.string().describe('ID of the environment'),
      serviceId: z
        .string()
        .optional()
        .describe(
          'ID of the service to get variables for. Omit for shared/project-level variables.'
        )
    })
  )
  .output(
    z.object({
      variables: z
        .record(z.string(), z.string())
        .describe('Key-value map of environment variables')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, tokenHeader: ctx.auth.tokenHeader });
    let variables = await client.getVariables(
      ctx.input.projectId,
      ctx.input.environmentId,
      ctx.input.serviceId
    );

    let count = Object.keys(variables).length;

    return {
      output: { variables },
      message: `Retrieved **${count}** variable(s).`
    };
  })
  .build();

export let setVariablesTool = SlateTool.create(spec, {
  name: 'Set Variables',
  key: 'set_variables',
  description: `Create or update one or more environment variables for a service. Provide variables as key-value pairs. Existing variables with the same name will be overwritten. Use **replaceAll** to remove all existing variables and set only the provided ones.`,
  instructions: [
    'To set a single variable, pass it in the "variables" object.',
    'To set multiple variables at once, pass all of them in the "variables" object.',
    'Use replaceAll: true to wipe existing variables and replace them with the provided set.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      environmentId: z.string().describe('ID of the environment'),
      serviceId: z.string().describe('ID of the service'),
      variables: z
        .record(z.string(), z.string())
        .describe('Key-value map of variables to set'),
      replaceAll: z
        .boolean()
        .optional()
        .default(false)
        .describe('If true, replaces all existing variables with the provided set')
    })
  )
  .output(
    z.object({
      set: z.boolean().describe('Whether the variables were set successfully'),
      count: z.number().describe('Number of variables that were set')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, tokenHeader: ctx.auth.tokenHeader });
    let count = Object.keys(ctx.input.variables).length;
    if (count === 0) {
      throw railwayServiceError('Provide at least one Railway variable to set.');
    }

    await client.upsertVariables({
      projectId: ctx.input.projectId,
      environmentId: ctx.input.environmentId,
      serviceId: ctx.input.serviceId,
      variables: ctx.input.variables,
      replace: ctx.input.replaceAll || undefined
    });

    return {
      output: { set: true, count },
      message: `Set **${count}** variable(s) successfully.`
    };
  })
  .build();

export let deleteVariableTool = SlateTool.create(spec, {
  name: 'Delete Variable',
  key: 'delete_variable',
  description: `Delete a specific environment variable from a service in a given environment.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      environmentId: z.string().describe('ID of the environment'),
      serviceId: z.string().describe('ID of the service'),
      name: z.string().describe('Name of the variable to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the variable was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, tokenHeader: ctx.auth.tokenHeader });
    await client.deleteVariable({
      projectId: ctx.input.projectId,
      environmentId: ctx.input.environmentId,
      serviceId: ctx.input.serviceId,
      name: ctx.input.name
    });

    return {
      output: { deleted: true },
      message: `Deleted variable **${ctx.input.name}**.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrayGraphqlClient } from '../lib/client';
import { spec } from '../spec';

export let listSolutionInstances = SlateTool.create(spec, {
  name: 'List Solution Instances',
  key: 'list_solution_instances',
  description: `List all solution instances for the authenticated user. Solution instances are end-user deployments of a solution with their specific configuration and authentication values. Requires a user token.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      solutionInstances: z.array(
        z.object({
          solutionInstanceId: z.string().describe('Unique instance ID'),
          name: z.string().describe('Instance name'),
          enabled: z.boolean().describe('Whether the instance is currently active'),
          created: z.string().describe('Creation timestamp'),
          owner: z.string().describe('Owner user ID'),
          hasNewerVersion: z
            .boolean()
            .describe('Whether a newer solution version is available')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrayGraphqlClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let instances = await client.listSolutionInstances();

    return {
      output: { solutionInstances: instances },
      message: `Found **${instances.length}** solution instance(s).`
    };
  })
  .build();

export let getSolutionInstance = SlateTool.create(spec, {
  name: 'Get Solution Instance',
  key: 'get_solution_instance',
  description: `Get detailed information about a specific solution instance including its configuration and authentication values. Requires a user token.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      solutionInstanceId: z.string().describe('ID of the solution instance to retrieve')
    })
  )
  .output(
    z.object({
      solutionInstanceId: z.string().describe('Unique instance ID'),
      name: z.string().describe('Instance name'),
      enabled: z.boolean().describe('Whether the instance is currently active'),
      created: z.string().describe('Creation timestamp'),
      authValues: z
        .array(
          z.object({
            externalId: z.string().describe('External ID of the auth slot'),
            authId: z.string().describe('Authentication ID assigned to this slot')
          })
        )
        .describe('Authentication values'),
      configValues: z
        .array(
          z.object({
            externalId: z.string().describe('External ID of the config slot'),
            value: z.string().describe('Configuration value')
          })
        )
        .describe('Configuration values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrayGraphqlClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let instance = await client.getSolutionInstance(ctx.input.solutionInstanceId);

    return {
      output: instance,
      message: `Retrieved solution instance **${instance.name}** (enabled: ${instance.enabled}).`
    };
  })
  .build();

export let createSolutionInstance = SlateTool.create(spec, {
  name: 'Create Solution Instance',
  key: 'create_solution_instance',
  description: `Create a new solution instance for the authenticated user. A solution instance is a user-specific deployment of a solution with custom configuration and authentication values. Requires a user token.`,
  instructions: [
    'The solutionId can be obtained from "List Solutions".',
    'Config and auth values use externalId identifiers defined in the solution template.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      solutionId: z.string().describe('ID of the solution to instantiate'),
      instanceName: z.string().describe('Display name for the new instance'),
      configValues: z
        .array(
          z.object({
            externalId: z.string().describe('External ID of the config slot'),
            value: z.string().describe('Value to assign')
          })
        )
        .optional()
        .describe('Initial configuration values'),
      authValues: z
        .array(
          z.object({
            externalId: z.string().describe('External ID of the auth slot'),
            authId: z.string().describe('Authentication ID to assign')
          })
        )
        .optional()
        .describe('Initial authentication values')
    })
  )
  .output(
    z.object({
      solutionInstanceId: z.string().describe('ID of the created instance'),
      name: z.string().describe('Instance name'),
      enabled: z.boolean().describe('Whether the instance is enabled'),
      created: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrayGraphqlClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let instance = await client.createSolutionInstance({
      solutionId: ctx.input.solutionId,
      instanceName: ctx.input.instanceName,
      configValues: ctx.input.configValues,
      authValues: ctx.input.authValues
    });

    return {
      output: instance,
      message: `Created solution instance **${instance.name}** (ID: ${instance.solutionInstanceId}).`
    };
  })
  .build();

export let updateSolutionInstance = SlateTool.create(spec, {
  name: 'Update Solution Instance',
  key: 'update_solution_instance',
  description: `Update a solution instance's name, enabled state, configuration values, or authentication values. Can also be used to enable or disable the instance. Requires a user token.`,
  instructions: [
    'The externalId fields in configValues and authValues are case-sensitive.',
    'Wait at least 2 seconds after creating an instance before enabling it.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      solutionInstanceId: z.string().describe('ID of the solution instance to update'),
      instanceName: z.string().optional().describe('New display name'),
      enabled: z.boolean().optional().describe('Enable or disable the instance'),
      configValues: z
        .array(
          z.object({
            externalId: z.string().describe('External ID of the config slot'),
            value: z.string().describe('New value')
          })
        )
        .optional()
        .describe('Updated configuration values'),
      authValues: z
        .array(
          z.object({
            externalId: z.string().describe('External ID of the auth slot'),
            authId: z.string().describe('New authentication ID')
          })
        )
        .optional()
        .describe('Updated authentication values')
    })
  )
  .output(
    z.object({
      solutionInstanceId: z.string().describe('ID of the updated instance'),
      name: z.string().describe('Instance name'),
      enabled: z.boolean().describe('Current enabled state'),
      created: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrayGraphqlClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let instance = await client.updateSolutionInstance({
      solutionInstanceId: ctx.input.solutionInstanceId,
      instanceName: ctx.input.instanceName,
      enabled: ctx.input.enabled,
      configValues: ctx.input.configValues,
      authValues: ctx.input.authValues
    });

    return {
      output: instance,
      message: `Updated solution instance **${instance.name}** (enabled: ${instance.enabled}).`
    };
  })
  .build();

export let deleteSolutionInstance = SlateTool.create(spec, {
  name: 'Delete Solution Instance',
  key: 'delete_solution_instance',
  description: `Permanently delete a solution instance. This removes the instance and all its configuration. Requires a user token.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      solutionInstanceId: z.string().describe('ID of the solution instance to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the instance was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrayGraphqlClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    await client.removeSolutionInstance(ctx.input.solutionInstanceId);

    return {
      output: { deleted: true },
      message: `Deleted solution instance **${ctx.input.solutionInstanceId}**.`
    };
  })
  .build();

export let upgradeSolutionInstance = SlateTool.create(spec, {
  name: 'Upgrade Solution Instance',
  key: 'upgrade_solution_instance',
  description: `Upgrade a solution instance to the latest published version of its solution. Only needed when the solution has been updated after the instance was created. Requires a user token.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      solutionInstanceId: z.string().describe('ID of the solution instance to upgrade')
    })
  )
  .output(
    z.object({
      solutionInstanceId: z.string().describe('ID of the upgraded instance')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrayGraphqlClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.upgradeSolutionInstance(ctx.input.solutionInstanceId);

    return {
      output: result,
      message: `Upgraded solution instance **${result.solutionInstanceId}** to the latest version.`
    };
  })
  .build();

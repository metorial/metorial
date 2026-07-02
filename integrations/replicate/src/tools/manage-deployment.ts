import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let deploymentOutputSchema = z.object({
  owner: z.string().describe('Deployment owner'),
  deploymentName: z.string().describe('Deployment name'),
  currentRelease: z
    .object({
      number: z.number().optional().describe('Release number'),
      model: z.string().optional().describe('Model identifier'),
      version: z.string().optional().describe('Model version ID'),
      createdAt: z.string().optional().describe('When this release was created'),
      hardware: z.string().optional().describe('Hardware SKU'),
      minInstances: z.number().optional().describe('Minimum instance count'),
      maxInstances: z.number().optional().describe('Maximum instance count')
    })
    .optional()
    .describe('Current deployment release configuration')
});

let mapDeployment = (result: any) => ({
  owner: result.owner,
  deploymentName: result.name,
  currentRelease: result.current_release
    ? {
        number: result.current_release.number,
        model: result.current_release.model,
        version: result.current_release.version,
        createdAt: result.current_release.created_at,
        hardware: result.current_release.configuration?.hardware,
        minInstances: result.current_release.configuration?.min_instances,
        maxInstances: result.current_release.configuration?.max_instances
      }
    : undefined
});

export let createDeployment = SlateTool.create(spec, {
  name: 'Create Deployment',
  key: 'create_deployment',
  description: `Create a new production deployment for a model on Replicate. Deployments provide dedicated infrastructure with configurable hardware and auto-scaling.`,
  instructions: [
    'Use the List Hardware tool to see available hardware options.',
    'Set minInstances to 0 for scale-to-zero behavior.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      deploymentName: z.string().describe('Name for the deployment'),
      model: z.string().describe('Model identifier in owner/name format'),
      version: z.string().describe('Model version ID to deploy'),
      hardware: z.string().describe('Hardware SKU (e.g. "gpu-a40-large", "gpu-t4", "cpu")'),
      minInstances: z.number().describe('Minimum number of instances (0 for scale-to-zero)'),
      maxInstances: z.number().describe('Maximum number of instances')
    })
  )
  .output(deploymentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createDeployment({
      name: ctx.input.deploymentName,
      model: ctx.input.model,
      version: ctx.input.version,
      hardware: ctx.input.hardware,
      minInstances: ctx.input.minInstances,
      maxInstances: ctx.input.maxInstances
    });

    return {
      output: mapDeployment(result),
      message: `Deployment **${result.owner}/${result.name}** created on **${ctx.input.hardware}**.`
    };
  })
  .build();

export let getDeployment = SlateTool.create(spec, {
  name: 'Get Deployment',
  key: 'get_deployment',
  description: `Get details about a specific deployment, including its current release configuration, hardware, and scaling settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Deployment owner username'),
      deploymentName: z.string().describe('Deployment name')
    })
  )
  .output(deploymentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getDeployment(ctx.input.owner, ctx.input.deploymentName);

    return {
      output: mapDeployment(result),
      message: `Deployment **${result.owner}/${result.name}** — hardware: **${result.current_release?.configuration?.hardware}**, instances: ${result.current_release?.configuration?.min_instances}-${result.current_release?.configuration?.max_instances}.`
    };
  })
  .build();

export let listDeployments = SlateTool.create(spec, {
  name: 'List Deployments',
  key: 'list_deployments',
  description: `List all deployments for your account.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      deployments: z.array(
        z.object({
          owner: z.string().describe('Deployment owner'),
          deploymentName: z.string().describe('Deployment name'),
          hardware: z.string().optional().describe('Hardware SKU'),
          model: z.string().optional().describe('Model identifier'),
          version: z.string().optional().describe('Model version'),
          minInstances: z.number().optional().describe('Min instances'),
          maxInstances: z.number().optional().describe('Max instances')
        })
      ),
      nextCursor: z.string().optional().nullable().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listDeployments({ cursor: ctx.input.cursor });

    let deployments = (result.results || []).map((d: any) => ({
      owner: d.owner,
      deploymentName: d.name,
      hardware: d.current_release?.configuration?.hardware,
      model: d.current_release?.model,
      version: d.current_release?.version,
      minInstances: d.current_release?.configuration?.min_instances,
      maxInstances: d.current_release?.configuration?.max_instances
    }));

    let nextCursor = result.next ? new URL(result.next).searchParams.get('cursor') : null;

    return {
      output: { deployments, nextCursor },
      message: `Found **${deployments.length}** deployments.`
    };
  })
  .build();

export let updateDeployment = SlateTool.create(spec, {
  name: 'Update Deployment',
  key: 'update_deployment',
  description: `Update a deployment's configuration, including hardware, scaling, or the model version it runs. Each update creates a new release.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z.string().describe('Deployment owner username'),
      deploymentName: z.string().describe('Deployment name'),
      version: z.string().optional().describe('New model version ID'),
      hardware: z.string().optional().describe('New hardware SKU'),
      minInstances: z.number().optional().describe('New minimum instance count'),
      maxInstances: z.number().optional().describe('New maximum instance count')
    })
  )
  .output(deploymentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateDeployment(ctx.input.owner, ctx.input.deploymentName, {
      version: ctx.input.version,
      hardware: ctx.input.hardware,
      minInstances: ctx.input.minInstances,
      maxInstances: ctx.input.maxInstances
    });

    return {
      output: mapDeployment(result),
      message: `Deployment **${result.owner}/${result.name}** updated (release #${result.current_release?.number}).`
    };
  })
  .build();

export let deleteDeployment = SlateTool.create(spec, {
  name: 'Delete Deployment',
  key: 'delete_deployment',
  description: `Delete a deployment. The deployment must be offline and unused for at least 15 minutes.`,
  constraints: [
    'Deployment must be offline.',
    'Deployment must have been unused for at least 15 minutes.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Deployment owner username'),
      deploymentName: z.string().describe('Deployment name to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deployment was deleted'),
      owner: z.string().describe('Former deployment owner'),
      deploymentName: z.string().describe('Former deployment name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteDeployment(ctx.input.owner, ctx.input.deploymentName);

    return {
      output: {
        deleted: true,
        owner: ctx.input.owner,
        deploymentName: ctx.input.deploymentName
      },
      message: `Deployment **${ctx.input.owner}/${ctx.input.deploymentName}** deleted.`
    };
  })
  .build();

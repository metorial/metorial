import { SlateTool } from 'slates';
import { z } from 'zod';
import { FigmaClient } from '../lib/client';
import { spec } from '../spec';

let devResourceSchema = z.object({
  devResourceId: z.string().describe('Unique dev resource identifier'),
  name: z.string().describe('Display name of the dev resource'),
  url: z.string().describe('URL of the dev resource'),
  fileKey: z.string().optional().describe('File key this resource belongs to'),
  nodeId: z.string().optional().describe('Node ID this resource is attached to')
});

let devResourceErrorSchema = z.object({
  fileKey: z.string().nullable().optional().describe('File key that failed, when provided'),
  nodeId: z.string().nullable().optional().describe('Node ID that failed, when provided'),
  devResourceId: z
    .string()
    .nullable()
    .optional()
    .describe('Dev resource ID that failed, when provided'),
  error: z.string().describe('Error message returned by Figma')
});

let mapDevResourceError = (error: any) => ({
  fileKey: error.file_key ?? undefined,
  nodeId: error.node_id ?? undefined,
  devResourceId: error.id ?? undefined,
  error: String(error.error ?? error.message ?? 'Unknown Figma dev resource error')
});

export let getDevResources = SlateTool.create(spec, {
  name: 'Get Dev Resources',
  key: 'get_dev_resources',
  description: `Retrieve developer resources attached to nodes in a Figma file. Dev resources are URLs shown in Dev Mode that link to code, documentation, or other developer resources.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileKey: z.string().describe('The key of the Figma file'),
      nodeId: z.string().optional().describe('Filter by specific node ID')
    })
  )
  .output(
    z.object({
      devResources: z.array(devResourceSchema).describe('List of dev resources')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FigmaClient(ctx.auth.token);
    let result = await client.getDevResources(ctx.input.fileKey, {
      nodeId: ctx.input.nodeId
    });

    let devResources = (result.dev_resources || []).map((r: any) => ({
      devResourceId: r.id,
      name: r.name,
      url: r.url,
      fileKey: r.file_key,
      nodeId: r.node_id
    }));

    return {
      output: { devResources },
      message: `Found **${devResources.length}** dev resource(s)`
    };
  })
  .build();

export let createDevResource = SlateTool.create(spec, {
  name: 'Create Dev Resources',
  key: 'create_dev_resources',
  description: `Attach developer resource URLs to nodes in Figma files. Supports creating multiple dev resources in one request across different files and nodes.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      resources: z
        .array(
          z.object({
            fileKey: z.string().describe('The file key'),
            nodeId: z.string().describe('The node ID to attach the resource to'),
            name: z.string().describe('Display name for the resource'),
            url: z.string().describe('URL of the resource')
          })
        )
        .describe('List of dev resources to create')
    })
  )
  .output(
    z.object({
      devResources: z.array(devResourceSchema).describe('Created dev resources'),
      errors: z
        .array(devResourceErrorSchema)
        .optional()
        .describe('Dev resources that Figma could not create')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FigmaClient(ctx.auth.token);
    let result = await client.createDevResources(ctx.input.resources);

    let created = result.links_created || result.dev_resources || [];
    let devResources = created.map((r: any) => ({
      devResourceId: r.id,
      name: r.name,
      url: r.url,
      fileKey: r.file_key,
      nodeId: r.node_id
    }));
    let errors = (result.errors || []).map(mapDevResourceError);

    return {
      output: { devResources, errors },
      message: `Created **${devResources.length}** dev resource(s)`
    };
  })
  .build();

export let deleteDevResource = SlateTool.create(spec, {
  name: 'Delete Dev Resource',
  key: 'delete_dev_resource',
  description: `Remove a developer resource from a Figma file node.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      fileKey: z.string().describe('The key of the Figma file'),
      devResourceId: z.string().describe('The ID of the dev resource to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the dev resource was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FigmaClient(ctx.auth.token);
    await client.deleteDevResource(ctx.input.fileKey, ctx.input.devResourceId);

    return {
      output: { deleted: true },
      message: `Deleted dev resource **${ctx.input.devResourceId}**`
    };
  })
  .build();

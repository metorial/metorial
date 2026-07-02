import { SlateTool } from 'slates';
import { z } from 'zod';
import * as containerRegistry from '../lib/container-registry';
import { spec } from '../spec';

export let listRegistries = SlateTool.create(spec, {
  name: 'List Container Registries',
  key: 'list_container_registries',
  description: `List Container Registry registries in a folder. Registries store and distribute Docker images within Yandex Cloud.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      folderId: z.string().optional().describe('Folder ID to list registries from'),
      pageSize: z.number().optional().describe('Maximum number of results'),
      pageToken: z.string().optional().describe('Pagination token')
    })
  )
  .output(
    z.object({
      registries: z
        .array(
          z.object({
            registryId: z.string().describe('Registry ID'),
            name: z.string().optional().describe('Registry name'),
            folderId: z.string().optional().describe('Folder ID'),
            status: z.string().optional().describe('Registry status'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            labels: z.record(z.string(), z.string()).optional().describe('Labels')
          })
        )
        .describe('List of registries'),
      nextPageToken: z.string().optional().describe('Next page token')
    })
  )
  .handleInvocation(async ctx => {
    let folderId = ctx.input.folderId || ctx.config.folderId;
    if (!folderId) throw new Error('folderId is required either in input or config');

    let result = await containerRegistry.listRegistries(
      ctx.auth,
      folderId,
      ctx.input.pageSize,
      ctx.input.pageToken
    );
    let registries = (result.registries || []).map((r: any) => ({
      registryId: r.id,
      name: r.name,
      folderId: r.folderId,
      status: r.status,
      createdAt: r.createdAt,
      labels: r.labels
    }));

    return {
      output: {
        registries,
        nextPageToken: result.nextPageToken
      },
      message: `Found ${registries.length} registry(ies) in folder ${folderId}.`
    };
  })
  .build();

export let manageRegistry = SlateTool.create(spec, {
  name: 'Manage Container Registry',
  key: 'manage_container_registry',
  description: `Create or delete a Container Registry in Yandex Cloud. Registries serve as namespaces for storing Docker images.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z.enum(['create', 'delete']).describe('Action to perform'),
      registryId: z.string().optional().describe('Registry ID (required for delete)'),
      folderId: z.string().optional().describe('Folder ID (required for create)'),
      name: z.string().optional().describe('Registry name (required for create)'),
      labels: z.record(z.string(), z.string()).optional().describe('Labels')
    })
  )
  .output(
    z.object({
      operationId: z.string().describe('Operation ID'),
      registryId: z.string().optional().describe('Registry ID'),
      done: z.boolean().describe('Whether the operation completed')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.action === 'create') {
      let folderId = ctx.input.folderId || ctx.config.folderId;
      if (!folderId) throw new Error('folderId is required for registry creation');
      if (!ctx.input.name) throw new Error('name is required for registry creation');

      let result = await containerRegistry.createRegistry(ctx.auth, {
        folderId,
        name: ctx.input.name,
        labels: ctx.input.labels
      });

      return {
        output: {
          operationId: result.id,
          registryId: result.metadata?.registryId,
          done: result.done || false
        },
        message: `Registry **${ctx.input.name}** creation initiated.`
      };
    } else {
      if (!ctx.input.registryId) throw new Error('registryId is required for deletion');

      let result = await containerRegistry.deleteRegistry(ctx.auth, ctx.input.registryId);

      return {
        output: {
          operationId: result.id,
          done: result.done || false
        },
        message: `Registry **${ctx.input.registryId}** deletion initiated.`
      };
    }
  })
  .build();

export let listContainerImages = SlateTool.create(spec, {
  name: 'List Container Images',
  key: 'list_container_images',
  description: `List Docker images in a Yandex Container Registry. Returns image metadata including tags and digests.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      registryId: z.string().describe('Registry ID to list images from'),
      pageSize: z.number().optional().describe('Maximum number of results'),
      pageToken: z.string().optional().describe('Pagination token')
    })
  )
  .output(
    z.object({
      images: z
        .array(
          z.object({
            imageId: z.string().describe('Image ID'),
            name: z.string().optional().describe('Image name'),
            digest: z.string().optional().describe('Image digest'),
            compressedSize: z.number().optional().describe('Compressed size in bytes'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            tags: z.array(z.string()).optional().describe('Image tags')
          })
        )
        .describe('List of Docker images'),
      nextPageToken: z.string().optional().describe('Next page token')
    })
  )
  .handleInvocation(async ctx => {
    let result = await containerRegistry.listImages(
      ctx.auth,
      ctx.input.registryId,
      ctx.input.pageSize,
      ctx.input.pageToken
    );
    let images = (result.images || []).map((i: any) => ({
      imageId: i.id,
      name: i.name,
      digest: i.digest,
      compressedSize: i.compressedSize ? Number(i.compressedSize) : undefined,
      createdAt: i.createdAt,
      tags: i.tags
    }));

    return {
      output: {
        images,
        nextPageToken: result.nextPageToken
      },
      message: `Found ${images.length} image(s) in registry ${ctx.input.registryId}.`
    };
  })
  .build();

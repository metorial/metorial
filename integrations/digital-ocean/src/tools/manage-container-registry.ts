import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { digitalOceanValidationError } from '../lib/errors';
import { spec } from '../spec';

export let manageContainerRegistry = SlateTool.create(spec, {
  name: 'Manage Container Registry',
  key: 'manage_container_registry',
  description: `View your container registry, list repositories and tags, or trigger garbage collection. DigitalOcean provides a private container registry for storing Docker images.`
})
  .input(
    z.object({
      action: z
        .enum([
          'get_registry',
          'list_repositories',
          'list_tags',
          'delete_tag',
          'garbage_collect'
        ])
        .describe('Action to perform'),
      registryName: z
        .string()
        .optional()
        .describe(
          'Registry name (required for list_repositories, list_tags, delete_tag, garbage_collect)'
        ),
      repositoryName: z
        .string()
        .optional()
        .describe('Repository name (required for list_tags, delete_tag)'),
      tag: z.string().optional().describe('Tag name (required for delete_tag)')
    })
  )
  .output(
    z.object({
      registry: z
        .object({
          name: z.string().describe('Registry name'),
          region: z.string().optional().describe('Region'),
          storageUsageBytes: z.number().optional().describe('Storage used in bytes'),
          createdAt: z.string().describe('Creation timestamp')
        })
        .optional()
        .describe('Registry details'),
      repositories: z
        .array(
          z.object({
            name: z.string().describe('Repository name'),
            tagCount: z.number().describe('Number of tags'),
            latestTag: z.string().optional().describe('Most recent tag')
          })
        )
        .optional()
        .describe('List of repositories'),
      tags: z
        .array(
          z.object({
            tag: z.string().describe('Tag name'),
            compressedSize: z.number().optional().describe('Compressed size in bytes'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .optional()
        .describe('List of tags'),
      deleted: z.boolean().optional().describe('Whether the tag was deleted'),
      garbageCollection: z
        .object({
          uuid: z.string().describe('Garbage collection ID'),
          status: z.string().describe('Status')
        })
        .optional()
        .describe('Garbage collection details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'get_registry') {
      let registry = await client.getContainerRegistry();
      return {
        output: {
          registry: {
            name: registry.name,
            region: registry.region,
            storageUsageBytes: registry.storage_usage_bytes,
            createdAt: registry.created_at
          }
        },
        message: `Registry **${registry.name}** — ${registry.storage_usage_bytes ? `${(registry.storage_usage_bytes / 1024 / 1024).toFixed(1)}MB used` : 'storage info unavailable'}.`
      };
    }

    if (ctx.input.action === 'list_repositories') {
      if (!ctx.input.registryName) {
        throw digitalOceanValidationError('registryName is required');
      }
      let repos = await client.listRegistryRepositories(ctx.input.registryName);
      return {
        output: {
          repositories: repos.map((r: any) => ({
            name: r.name,
            tagCount: r.tag_count,
            latestTag: r.latest_tag?.tag
          }))
        },
        message: `Found **${repos.length}** repositories in registry **${ctx.input.registryName}**.`
      };
    }

    if (ctx.input.action === 'list_tags') {
      if (!ctx.input.registryName || !ctx.input.repositoryName) {
        throw digitalOceanValidationError('registryName and repositoryName are required');
      }
      let tags = await client.listRegistryRepositoryTags(
        ctx.input.registryName,
        ctx.input.repositoryName
      );
      return {
        output: {
          tags: tags.map((t: any) => ({
            tag: t.tag,
            compressedSize: t.compressed_size,
            updatedAt: t.updated_at
          }))
        },
        message: `Found **${tags.length}** tag(s) in **${ctx.input.repositoryName}**.`
      };
    }

    if (ctx.input.action === 'delete_tag') {
      if (!ctx.input.registryName || !ctx.input.repositoryName || !ctx.input.tag) {
        throw digitalOceanValidationError(
          'registryName, repositoryName, and tag are required'
        );
      }
      await client.deleteRegistryRepositoryTag(
        ctx.input.registryName,
        ctx.input.repositoryName,
        ctx.input.tag
      );
      return {
        output: { deleted: true },
        message: `Deleted tag **${ctx.input.tag}** from **${ctx.input.repositoryName}**.`
      };
    }

    // garbage_collect
    if (!ctx.input.registryName) {
      throw digitalOceanValidationError('registryName is required');
    }
    let gc = await client.runRegistryGarbageCollection(ctx.input.registryName);
    return {
      output: {
        garbageCollection: {
          uuid: gc.uuid,
          status: gc.status
        }
      },
      message: `Started garbage collection on registry **${ctx.input.registryName}** (ID: ${gc.uuid}).`
    };
  })
  .build();

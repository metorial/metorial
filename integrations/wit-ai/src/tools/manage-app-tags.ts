import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let tagSchema = z.object({
  name: z.string().optional().describe('Tag name'),
  tag: z.string().optional().describe('Tag identifier'),
  description: z.string().optional().describe('Tag description'),
  createdAt: z.string().optional().describe('When the tag was created'),
  updatedAt: z.string().optional().describe('When the tag was last updated')
});

export let listAppTags = SlateTool.create(spec, {
  name: 'List App Tags',
  key: 'list_app_tags',
  description: `List all version tags for a Wit.ai app. Tags provide version control for your NLU models, allowing you to snapshot and reference specific model versions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appId: z.string().describe('ID of the app')
    })
  )
  .output(
    z.object({
      appTags: z.array(tagSchema).describe('List of version tags')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.listAppTags(ctx.input.appId);

    let tagsList = Array.isArray(result) ? result : [];

    return {
      output: {
        appTags: tagsList.map((t: Record<string, unknown>) => ({
          name: t.name as string | undefined,
          tag: t.tag as string | undefined,
          description: t.description as string | undefined,
          createdAt: t.created_at as string | undefined,
          updatedAt: t.updated_at as string | undefined
        }))
      },
      message: `Found **${tagsList.length}** tag(s) for app \`${ctx.input.appId}\`.`
    };
  })
  .build();

export let createAppTag = SlateTool.create(spec, {
  name: 'Create App Tag',
  key: 'create_app_tag',
  description: `Create a new version tag for a Wit.ai app. Tags snapshot the current NLU model state for versioning.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      appId: z.string().describe('ID of the app'),
      tagName: z.string().describe('Name for the new tag')
    })
  )
  .output(tagSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.createAppTag(ctx.input.appId, ctx.input.tagName);

    return {
      output: {
        name: result.name,
        tag: result.tag,
        description: result.description,
        createdAt: result.created_at,
        updatedAt: result.updated_at
      },
      message: `Created tag **${ctx.input.tagName}** for app \`${ctx.input.appId}\`.`
    };
  })
  .build();

export let deleteAppTag = SlateTool.create(spec, {
  name: 'Delete App Tag',
  key: 'delete_app_tag',
  description: `Delete a version tag from a Wit.ai app. This cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      appId: z.string().describe('ID of the app'),
      tagName: z.string().describe('Name of the tag to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the tag was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    await client.deleteAppTag(ctx.input.appId, ctx.input.tagName);

    return {
      output: { deleted: true },
      message: `Deleted tag **${ctx.input.tagName}** from app \`${ctx.input.appId}\`.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let vector3Schema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number()
});

let tagSchema = z.object({
  tagId: z.string().describe('Unique tag identifier'),
  floorId: z.string().nullable().optional().describe('Floor the tag is on'),
  created: z.string().nullable().optional().describe('Creation timestamp'),
  modified: z.string().nullable().optional().describe('Last modified timestamp'),
  enabled: z.boolean().nullable().optional().describe('Whether the tag is enabled'),
  color: z.string().nullable().optional().describe('Tag color hex code'),
  label: z.string().nullable().optional().describe('Tag label text'),
  description: z.string().nullable().optional().describe('Tag description'),
  icon: z.string().nullable().optional().describe('Tag icon identifier'),
  keywords: z.array(z.string()).nullable().optional().describe('Tag keywords'),
  media: z.string().nullable().optional().describe('Media URL'),
  mediaType: z
    .string()
    .nullable()
    .optional()
    .describe('Media type (none, photo, video, rich)'),
  position: z.any().nullable().optional().describe('Tag position in 3D space'),
  anchorPosition: z.any().nullable().optional().describe('Anchor position in 3D space'),
  stemNormal: z.any().nullable().optional().describe('Stem normal direction vector'),
  stemLength: z.number().nullable().optional().describe('Stem length'),
  stemEnabled: z.boolean().nullable().optional().describe('Whether stem is visible')
});

export let listTags = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description: `List all Mattertags (annotation tags) on a Matterport 3D model. Returns tag details including position, content, color, media, and metadata. Includes both enabled and disabled tags.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      modelId: z.string().describe('The unique ID of the Matterport model')
    })
  )
  .output(
    z.object({
      tags: z.array(tagSchema).describe('List of tags on the model')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let tags = await client.getTags(ctx.input.modelId);

    let mappedTags = (tags || []).map((t: any) => ({
      tagId: t.id,
      floorId: t.floor?.id || null,
      created: t.created,
      modified: t.modified,
      enabled: t.enabled,
      color: t.color,
      label: t.label,
      description: t.description,
      icon: t.icon,
      keywords: t.keywords,
      media: t.media,
      mediaType: t.mediaType,
      position: t.position,
      anchorPosition: t.anchorPosition,
      stemNormal: t.stemNormal,
      stemLength: t.stemLength,
      stemEnabled: t.stemEnabled
    }));

    return {
      output: { tags: mappedTags },
      message: `Found **${mappedTags.length}** tags on model **${ctx.input.modelId}**.`
    };
  })
  .build();

export let createTag = SlateTool.create(spec, {
  name: 'Create Tag',
  key: 'create_tag',
  description: `Create a new Mattertag annotation on a Matterport 3D model. Tags are positioned in 3D space and can contain text, links, and media content.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      modelId: z.string().describe('The unique ID of the Matterport model'),
      floorId: z.string().describe('The floor ID where the tag will be placed'),
      label: z.string().optional().describe('Tag label text'),
      description: z.string().optional().describe('Tag description or content'),
      color: z.string().optional().describe('Tag color as hex code (e.g. "#03687d")'),
      icon: z.string().optional().describe('Tag icon identifier'),
      keywords: z.array(z.string()).optional().describe('Tag keywords for categorization'),
      enabled: z.boolean().optional().default(true).describe('Whether the tag is visible'),
      anchorPosition: vector3Schema.describe('3D position where the tag is anchored'),
      stemNormal: vector3Schema.optional().describe('Direction vector for the tag stem'),
      stemLength: z.number().optional().describe('Length of the tag stem'),
      stemEnabled: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to show the tag stem'),
      mediaType: z
        .enum(['none', 'photo', 'video', 'rich'])
        .optional()
        .describe('Type of media attached'),
      mediaUrl: z.string().optional().describe('URL of the media content')
    })
  )
  .output(
    z.object({
      tagId: z.string().describe('ID of the newly created tag')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.addTag(ctx.input.modelId, {
      floorId: ctx.input.floorId,
      label: ctx.input.label,
      description: ctx.input.description,
      color: ctx.input.color,
      icon: ctx.input.icon,
      keywords: ctx.input.keywords,
      enabled: ctx.input.enabled,
      anchorPosition: ctx.input.anchorPosition,
      stemNormal: ctx.input.stemNormal,
      stemLength: ctx.input.stemLength,
      stemEnabled: ctx.input.stemEnabled,
      mediaType: ctx.input.mediaType,
      mediaUrl: ctx.input.mediaUrl
    });

    return {
      output: { tagId: result.id },
      message: `Created tag **${ctx.input.label || result.id}** on model **${ctx.input.modelId}**.`
    };
  })
  .build();

export let updateTag = SlateTool.create(spec, {
  name: 'Update Tag',
  key: 'update_tag',
  description: `Update an existing Mattertag on a Matterport 3D model. Modify tag content, position, appearance, and media. Only provided fields will be updated.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      modelId: z.string().describe('The unique ID of the Matterport model'),
      tagId: z.string().describe('The ID of the tag to update'),
      label: z.string().optional().describe('New label text'),
      description: z.string().optional().describe('New description or content'),
      color: z.string().optional().describe('New color as hex code'),
      icon: z.string().optional().describe('New icon identifier'),
      keywords: z.array(z.string()).optional().describe('New keywords'),
      enabled: z.boolean().optional().describe('Whether the tag is visible'),
      anchorPosition: vector3Schema.optional().describe('New 3D anchor position'),
      stemNormal: vector3Schema.optional().describe('New stem direction vector'),
      stemLength: z.number().optional().describe('New stem length'),
      stemEnabled: z.boolean().optional().describe('Whether to show the stem'),
      mediaType: z
        .enum(['none', 'photo', 'video', 'rich'])
        .optional()
        .describe('New media type'),
      mediaUrl: z.string().optional().describe('New media URL')
    })
  )
  .output(
    z.object({
      tagId: z.string().describe('ID of the updated tag')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let patch: Record<string, any> = {};
    if (ctx.input.label !== undefined) patch.label = ctx.input.label;
    if (ctx.input.description !== undefined) patch.description = ctx.input.description;
    if (ctx.input.color !== undefined) patch.color = ctx.input.color;
    if (ctx.input.icon !== undefined) patch.icon = ctx.input.icon;
    if (ctx.input.keywords !== undefined) patch.keywords = ctx.input.keywords;
    if (ctx.input.enabled !== undefined) patch.enabled = ctx.input.enabled;
    if (ctx.input.anchorPosition !== undefined)
      patch.anchorPosition = ctx.input.anchorPosition;
    if (ctx.input.stemNormal !== undefined) patch.stemNormal = ctx.input.stemNormal;
    if (ctx.input.stemLength !== undefined) patch.stemLength = ctx.input.stemLength;
    if (ctx.input.stemEnabled !== undefined) patch.stemEnabled = ctx.input.stemEnabled;
    if (ctx.input.mediaType !== undefined) patch.mediaType = ctx.input.mediaType;
    if (ctx.input.mediaUrl !== undefined) patch.mediaUrl = ctx.input.mediaUrl;

    let result = await client.updateTag(ctx.input.modelId, ctx.input.tagId, patch);

    return {
      output: { tagId: result.id },
      message: `Updated tag **${ctx.input.tagId}** on model **${ctx.input.modelId}**.`
    };
  })
  .build();

export let deleteTag = SlateTool.create(spec, {
  name: 'Delete Tag',
  key: 'delete_tag',
  description: `Remove a Mattertag from a Matterport 3D model. This permanently deletes the tag and its content.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      modelId: z.string().describe('The unique ID of the Matterport model'),
      tagId: z.string().describe('The ID of the tag to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the tag was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    await client.deleteTag(ctx.input.modelId, ctx.input.tagId);

    return {
      output: { success: true },
      message: `Deleted tag **${ctx.input.tagId}** from model **${ctx.input.modelId}**.`
    };
  })
  .build();

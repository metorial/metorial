import { SlateTool } from 'slates';
import { z } from 'zod';
import { GhostAdminClient } from '../lib/client';
import { spec } from '../spec';

let tagOutputSchema = z.object({
  tagId: z.string().describe('Unique tag ID'),
  name: z.string().describe('Tag name'),
  slug: z.string().describe('URL-friendly slug'),
  description: z.string().nullable().describe('Tag description'),
  featureImage: z.string().nullable().describe('Tag feature image URL'),
  visibility: z.string().describe('Tag visibility (public or internal)'),
  metaTitle: z.string().nullable().describe('SEO meta title'),
  metaDescription: z.string().nullable().describe('SEO meta description'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp'),
  url: z.string().describe('Tag URL')
});

export let manageTag = SlateTool.create(spec, {
  name: 'Manage Tag',
  key: 'manage_tag',
  description: `Create, read, update, or delete a tag. Tags organize posts and pages into categories. Internal tags (prefixed with \`#\`) are hidden from the public site.`,
  instructions: [
    'For **creating**: set `action` to `"create"` and provide a `name`.',
    'For **reading**: set `action` to `"read"` and provide `tagId` or `slug`.',
    'For **updating**: set `action` to `"update"`, provide `tagId` plus fields to change.',
    'For **deleting**: set `action` to `"delete"` and provide `tagId`.',
    'Prefix the tag name with `#` to create an internal (private) tag.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'read', 'update', 'delete']).describe('Operation to perform'),
      tagId: z.string().optional().describe('Tag ID (required for read/update/delete)'),
      slug: z.string().optional().describe('Tag slug (alternative to tagId for reading)'),
      name: z.string().optional().describe('Tag name'),
      description: z.string().optional().describe('Tag description'),
      featureImage: z.string().optional().describe('Feature image URL'),
      visibility: z.enum(['public', 'internal']).optional().describe('Tag visibility'),
      metaTitle: z.string().optional().describe('SEO meta title'),
      metaDescription: z.string().optional().describe('SEO meta description')
    })
  )
  .output(tagOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GhostAdminClient({
      domain: ctx.config.adminDomain,
      apiKey: ctx.auth.token
    });

    let { action } = ctx.input;

    if (action === 'read') {
      let result: any;
      if (ctx.input.slug) {
        result = await client.readTagBySlug(ctx.input.slug);
      } else if (ctx.input.tagId) {
        result = await client.readTag(ctx.input.tagId);
      } else {
        throw new Error('Either tagId or slug is required for reading a tag');
      }
      let t = result.tags[0];
      return { output: mapTag(t), message: `Retrieved tag **"${t.name}"**.` };
    }

    if (action === 'delete') {
      if (!ctx.input.tagId) throw new Error('tagId is required for deleting a tag');
      await client.deleteTag(ctx.input.tagId);
      return {
        output: {
          tagId: ctx.input.tagId,
          name: '',
          slug: '',
          description: null,
          featureImage: null,
          visibility: '',
          metaTitle: null,
          metaDescription: null,
          createdAt: '',
          updatedAt: '',
          url: ''
        },
        message: `Deleted tag \`${ctx.input.tagId}\`.`
      };
    }

    let tagData: Record<string, any> = {};
    if (ctx.input.name !== undefined) tagData.name = ctx.input.name;
    if (ctx.input.description !== undefined) tagData.description = ctx.input.description;
    if (ctx.input.featureImage !== undefined) tagData.feature_image = ctx.input.featureImage;
    if (ctx.input.visibility !== undefined) tagData.visibility = ctx.input.visibility;
    if (ctx.input.metaTitle !== undefined) tagData.meta_title = ctx.input.metaTitle;
    if (ctx.input.metaDescription !== undefined)
      tagData.meta_description = ctx.input.metaDescription;

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for creating a tag');
      let result = await client.createTag(tagData);
      let t = result.tags[0];
      return { output: mapTag(t), message: `Created tag **"${t.name}"**.` };
    }

    if (action === 'update') {
      if (!ctx.input.tagId) throw new Error('tagId is required for updating a tag');
      let result = await client.updateTag(ctx.input.tagId, tagData);
      let t = result.tags[0];
      return { output: mapTag(t), message: `Updated tag **"${t.name}"**.` };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();

let mapTag = (t: any) => ({
  tagId: t.id,
  name: t.name,
  slug: t.slug,
  description: t.description ?? null,
  featureImage: t.feature_image ?? null,
  visibility: t.visibility,
  metaTitle: t.meta_title ?? null,
  metaDescription: t.meta_description ?? null,
  createdAt: t.created_at,
  updatedAt: t.updated_at,
  url: t.url
});

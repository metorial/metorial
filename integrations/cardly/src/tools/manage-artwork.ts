import { SlateTool } from 'slates';
import { z } from 'zod';
import { CardlyClient } from '../lib/client';
import { spec } from '../spec';

let artworkPageSchema = z.object({
  page: z
    .number()
    .describe(
      'Page number (e.g. 1 for front, 2 for inner left, 3 for inner right, 4 for back)'
    ),
  image: z.string().describe('Base64-encoded image data for this page')
});

let artworkOutputSchema = z.object({
  artworkId: z.string().describe('Unique artwork ID'),
  revision: z.number().describe('Artwork revision number'),
  name: z.string().describe('Artwork name'),
  slug: z.string().describe('URL-friendly slug'),
  fullPath: z.string().describe('Full path to the artwork'),
  description: z.string().describe('Artwork description'),
  pages: z
    .array(
      z.object({
        page: z.number().describe('Page number'),
        url: z.string().optional().describe('URL of the page image')
      })
    )
    .describe('Artwork pages'),
  media: z.record(z.string(), z.unknown()).describe('Associated media/product type'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let listArtwork = SlateTool.create(spec, {
  name: 'List Artwork',
  key: 'list_artwork',
  description: `List available card artwork for your organisation. Returns both organisation-specific and shared/free artwork. Use the ownOnly filter to see only your uploaded artwork.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ownOnly: z
        .boolean()
        .optional()
        .describe('If true, return only artwork owned by your organisation'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default 25)'),
      offset: z.number().optional().describe('Number of records to skip for pagination')
    })
  )
  .output(
    z.object({
      artwork: z.array(artworkOutputSchema).describe('List of artwork'),
      totalRecords: z.number().describe('Total number of matching records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });

    let result = await client.listArtwork({
      ownOnly: ctx.input.ownOnly,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let artwork = result.artwork.map(a => ({
      artworkId: a.id,
      revision: a.revision,
      name: a.name,
      slug: a.slug,
      fullPath: a.fullPath,
      description: a.description,
      pages: a.artwork.map(p => ({ page: p.page, url: p.url })),
      media: a.media,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt
    }));

    return {
      output: {
        artwork,
        totalRecords: result.meta.totalRecords
      },
      message: `Found **${artwork.length}** artwork item(s) (${result.meta.totalRecords} total).`
    };
  })
  .build();

export let createArtwork = SlateTool.create(spec, {
  name: 'Create Artwork',
  key: 'create_artwork',
  description: `Upload new card artwork with base64-encoded page images. Artwork is associated with a specific media type (product size). Use the list resources tool to discover available media types.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mediaId: z.string().describe('UUID of the media/product type for this artwork'),
      name: z.string().describe('Name for the artwork'),
      description: z.string().optional().describe('Description of the artwork'),
      pages: z
        .array(artworkPageSchema)
        .min(1)
        .describe('Page images as base64-encoded strings')
    })
  )
  .output(artworkOutputSchema)
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });

    let result = await client.createArtwork({
      media: ctx.input.mediaId,
      name: ctx.input.name,
      description: ctx.input.description,
      artwork: ctx.input.pages
    });

    return {
      output: {
        artworkId: result.id,
        revision: result.revision,
        name: result.name,
        slug: result.slug,
        fullPath: result.fullPath,
        description: result.description,
        pages: result.artwork.map(p => ({ page: p.page, url: p.url })),
        media: result.media,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      },
      message: `Artwork **${result.name}** created successfully with ID **${result.id}**.`
    };
  })
  .build();

export let editArtwork = SlateTool.create(spec, {
  name: 'Edit Artwork',
  key: 'edit_artwork',
  description: `Update an existing artwork's name, description, or page images. Only provide the fields you want to change.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      artworkId: z.string().describe('UUID of the artwork to edit'),
      name: z.string().optional().describe('New name for the artwork'),
      description: z.string().optional().describe('New description for the artwork'),
      pages: z
        .array(artworkPageSchema)
        .optional()
        .describe('Updated page images as base64-encoded strings')
    })
  )
  .output(artworkOutputSchema)
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });

    let result = await client.editArtwork(ctx.input.artworkId, {
      name: ctx.input.name,
      description: ctx.input.description,
      artwork: ctx.input.pages
    });

    return {
      output: {
        artworkId: result.id,
        revision: result.revision,
        name: result.name,
        slug: result.slug,
        fullPath: result.fullPath,
        description: result.description,
        pages: result.artwork.map(p => ({ page: p.page, url: p.url })),
        media: result.media,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      },
      message: `Artwork **${result.name}** (${result.id}) updated successfully.`
    };
  })
  .build();

export let deleteArtwork = SlateTool.create(spec, {
  name: 'Delete Artwork',
  key: 'delete_artwork',
  description: `Permanently delete artwork from your organisation. This cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      artworkId: z.string().describe('UUID of the artwork to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the artwork was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });
    await client.deleteArtwork(ctx.input.artworkId);

    return {
      output: { deleted: true },
      message: `Artwork **${ctx.input.artworkId}** deleted successfully.`
    };
  })
  .build();

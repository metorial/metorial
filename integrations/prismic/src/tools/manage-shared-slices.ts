import { SlateTool } from 'slates';
import { z } from 'zod';
import { TypesApiClient } from '../lib/client';
import { spec } from '../spec';

let variationSchema = z.object({
  variationId: z.string().describe('Variation ID'),
  name: z.string().describe('Variation name'),
  description: z.string().optional().describe('Variation description'),
  docURL: z.string().optional().describe('Documentation URL'),
  version: z.string().optional().describe('Variation version'),
  primary: z.record(z.string(), z.any()).optional().describe('Primary zone field definitions'),
  items: z
    .record(z.string(), z.any())
    .optional()
    .describe('Repeatable zone field definitions'),
  imageUrl: z.string().optional().describe('Screenshot URL')
});

let sharedSliceOutputSchema = z.object({
  sliceId: z.string().describe('Shared slice ID'),
  type: z.string().describe('Slice type identifier'),
  name: z.string().describe('Display name'),
  description: z.string().optional().describe('Slice description'),
  variations: z.array(variationSchema).describe('Slice variations')
});

export let listSharedSlices = SlateTool.create(spec, {
  name: 'List Shared Slices',
  key: 'list_shared_slices',
  description: `List all shared slices in the Prismic repository. Shared slices are reusable page sections that can be used across multiple custom types.
Requires a Write API token.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      sharedSlices: z.array(sharedSliceOutputSchema).describe('All shared slices')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.writeToken) {
      throw new Error('Write API token is required for managing shared slices.');
    }

    let client = new TypesApiClient({
      repositoryName: ctx.config.repositoryName,
      writeToken: ctx.auth.writeToken
    });

    let slices = await client.listSharedSlices();

    return {
      output: {
        sharedSlices: slices.map(s => ({
          sliceId: s.id,
          type: s.type,
          name: s.name,
          description: s.description,
          variations: s.variations.map(v => ({
            variationId: v.id,
            name: v.name,
            description: v.description,
            docURL: v.docURL,
            version: v.version,
            primary: v.primary,
            items: v.items,
            imageUrl: v.imageUrl
          }))
        }))
      },
      message: `Found **${slices.length}** shared slices.`
    };
  })
  .build();

export let createSharedSlice = SlateTool.create(spec, {
  name: 'Create Shared Slice',
  key: 'create_shared_slice',
  description: `Create a new shared slice in the Prismic repository. Shared slices are reusable content sections.
Requires a Write API token.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sliceId: z.string().describe('Unique ID for the shared slice'),
      type: z.string().describe('Slice type identifier (typically "SharedSlice")'),
      name: z.string().describe('Display name of the slice'),
      description: z.string().optional().describe('Description of the slice'),
      variations: z
        .array(
          z.object({
            variationId: z.string().describe('Variation ID'),
            name: z.string().describe('Variation name'),
            description: z.string().optional().describe('Variation description'),
            docURL: z.string().optional().describe('Documentation URL'),
            version: z.string().optional().describe('Variation version'),
            primary: z
              .record(z.string(), z.any())
              .optional()
              .describe('Primary zone field definitions'),
            items: z
              .record(z.string(), z.any())
              .optional()
              .describe('Repeatable zone field definitions'),
            imageUrl: z.string().optional().describe('Screenshot URL')
          })
        )
        .describe('Slice variations')
    })
  )
  .output(sharedSliceOutputSchema)
  .handleInvocation(async ctx => {
    if (!ctx.auth.writeToken) {
      throw new Error('Write API token is required for managing shared slices.');
    }

    let client = new TypesApiClient({
      repositoryName: ctx.config.repositoryName,
      writeToken: ctx.auth.writeToken
    });

    let s = await client.createSharedSlice({
      id: ctx.input.sliceId,
      type: ctx.input.type,
      name: ctx.input.name,
      description: ctx.input.description,
      variations: ctx.input.variations.map(v => ({
        id: v.variationId,
        name: v.name,
        description: v.description,
        docURL: v.docURL,
        version: v.version,
        primary: v.primary,
        items: v.items,
        imageUrl: v.imageUrl
      }))
    });

    return {
      output: {
        sliceId: s.id,
        type: s.type,
        name: s.name,
        description: s.description,
        variations: s.variations.map(v => ({
          variationId: v.id,
          name: v.name,
          description: v.description,
          docURL: v.docURL,
          version: v.version,
          primary: v.primary,
          items: v.items,
          imageUrl: v.imageUrl
        }))
      },
      message: `Created shared slice **${s.name}** (${s.id}).`
    };
  })
  .build();

export let updateSharedSlice = SlateTool.create(spec, {
  name: 'Update Shared Slice',
  key: 'update_shared_slice',
  description: `Update an existing shared slice's definition, including its variations and field schemas.
Requires a Write API token.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      sliceId: z.string().describe('ID of the shared slice to update'),
      type: z.string().describe('Slice type identifier'),
      name: z.string().describe('Updated display name'),
      description: z.string().optional().describe('Updated description'),
      variations: z
        .array(
          z.object({
            variationId: z.string().describe('Variation ID'),
            name: z.string().describe('Variation name'),
            description: z.string().optional(),
            docURL: z.string().optional(),
            version: z.string().optional(),
            primary: z.record(z.string(), z.any()).optional(),
            items: z.record(z.string(), z.any()).optional(),
            imageUrl: z.string().optional()
          })
        )
        .describe('Updated slice variations')
    })
  )
  .output(sharedSliceOutputSchema)
  .handleInvocation(async ctx => {
    if (!ctx.auth.writeToken) {
      throw new Error('Write API token is required for managing shared slices.');
    }

    let client = new TypesApiClient({
      repositoryName: ctx.config.repositoryName,
      writeToken: ctx.auth.writeToken
    });

    let s = await client.updateSharedSlice({
      id: ctx.input.sliceId,
      type: ctx.input.type,
      name: ctx.input.name,
      description: ctx.input.description,
      variations: ctx.input.variations.map(v => ({
        id: v.variationId,
        name: v.name,
        description: v.description,
        docURL: v.docURL,
        version: v.version,
        primary: v.primary,
        items: v.items,
        imageUrl: v.imageUrl
      }))
    });

    return {
      output: {
        sliceId: s.id,
        type: s.type,
        name: s.name,
        description: s.description,
        variations: s.variations.map(v => ({
          variationId: v.id,
          name: v.name,
          description: v.description,
          docURL: v.docURL,
          version: v.version,
          primary: v.primary,
          items: v.items,
          imageUrl: v.imageUrl
        }))
      },
      message: `Updated shared slice **${s.name}** (${s.id}).`
    };
  })
  .build();

export let deleteSharedSlice = SlateTool.create(spec, {
  name: 'Delete Shared Slice',
  key: 'delete_shared_slice',
  description: `Delete a shared slice from the Prismic repository. This action is irreversible.
Requires a Write API token.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      sliceId: z.string().describe('ID of the shared slice to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the slice was successfully deleted'),
      sliceId: z.string().describe('ID of the deleted slice')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.writeToken) {
      throw new Error('Write API token is required for managing shared slices.');
    }

    let client = new TypesApiClient({
      repositoryName: ctx.config.repositoryName,
      writeToken: ctx.auth.writeToken
    });

    await client.deleteSharedSlice(ctx.input.sliceId);

    return {
      output: {
        deleted: true,
        sliceId: ctx.input.sliceId
      },
      message: `Deleted shared slice **${ctx.input.sliceId}**.`
    };
  })
  .build();

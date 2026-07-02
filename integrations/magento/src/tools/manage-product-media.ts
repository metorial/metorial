import { SlateTool } from 'slates';
import { z } from 'zod';
import { MagentoClient } from '../lib/client';
import { magentoServiceError } from '../lib/errors';
import { spec } from '../spec';

let mediaOutputSchema = z.object({
  mediaId: z.string().optional().describe('Product media entry ID'),
  mediaType: z.string().optional().describe('Media type, such as image'),
  label: z.string().optional().describe('Media label'),
  position: z.number().optional().describe('Media sort position'),
  disabled: z.boolean().optional().describe('Whether this media entry is disabled'),
  types: z
    .array(z.string())
    .optional()
    .describe('Assigned image roles, such as image, small_image, and thumbnail'),
  file: z.string().optional().describe('Stored media file path')
});

let mapMedia = (entry: any) => ({
  mediaId: entry.id !== undefined ? String(entry.id) : undefined,
  mediaType: entry.media_type,
  label: entry.label,
  position: entry.position,
  disabled: entry.disabled,
  types: entry.types,
  file: entry.file
});

let requireReplacementContent = (input: {
  imageBase64?: string;
  mimeType?: string;
  fileName?: string;
}) => {
  let hasAnyContent =
    input.imageBase64 !== undefined ||
    input.mimeType !== undefined ||
    input.fileName !== undefined;
  let hasAllContent =
    input.imageBase64 !== undefined &&
    input.mimeType !== undefined &&
    input.fileName !== undefined;

  if (hasAnyContent && !hasAllContent) {
    throw magentoServiceError(
      'imageBase64, mimeType, and fileName must be provided together.'
    );
  }
};

export let manageProductMedia = SlateTool.create(spec, {
  name: 'Manage Product Media',
  key: 'manage_product_media',
  description:
    'List, add, update, or delete product media gallery entries. Use this for product images and storefront image roles such as image, small_image, and thumbnail.',
  instructions: [
    'To **list** media entries, provide sku and set action to "list".',
    'To **add** an image, provide sku, imageBase64, mimeType, and fileName. Optionally set label, position, disabled, and types.',
    'To **update** an image, provide sku and entryId. Provide imageBase64, mimeType, and fileName together when replacing the image binary.',
    'To **delete** an image, provide sku and entryId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'add', 'update', 'delete']).describe('Media operation'),
      sku: z.string().describe('Product SKU'),
      entryId: z.number().optional().describe('Media entry ID for update and delete'),
      label: z.string().optional().describe('Media label'),
      position: z.number().optional().describe('Media sort position'),
      disabled: z.boolean().optional().describe('Whether the media entry is disabled'),
      types: z
        .array(z.string())
        .optional()
        .describe('Image roles to assign, such as image, small_image, and thumbnail'),
      imageBase64: z
        .string()
        .optional()
        .describe('Base64-encoded image bytes for add or binary replacement update'),
      mimeType: z.string().optional().describe('Image MIME type, such as image/png'),
      fileName: z.string().optional().describe('Image file name, such as product-image.png')
    })
  )
  .output(
    z.object({
      mediaEntries: z.array(mediaOutputSchema).optional().describe('Product media entries'),
      media: mediaOutputSchema.optional().describe('Created or updated product media entry'),
      mediaId: z.string().optional().describe('Created media entry ID'),
      success: z.boolean().optional().describe('Whether the operation succeeded'),
      deleted: z.boolean().optional().describe('Whether the media entry was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MagentoClient({
      storeUrl: ctx.config.storeUrl,
      storeCode: ctx.config.storeCode,
      token: ctx.auth.token
    });

    if (ctx.input.action === 'list') {
      let mediaEntries = await client.listProductMedia(ctx.input.sku);
      let entryLabel = mediaEntries.length === 1 ? 'entry' : 'entries';
      return {
        output: { mediaEntries: mediaEntries.map(mapMedia) },
        message: `Found **${mediaEntries.length}** media ${entryLabel} for SKU \`${ctx.input.sku}\`.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (ctx.input.entryId === undefined) {
        throw magentoServiceError('entryId is required for delete action');
      }

      await client.deleteProductMedia(ctx.input.sku, ctx.input.entryId);
      return {
        output: { deleted: true },
        message: `Deleted media entry \`${ctx.input.entryId}\` from SKU \`${ctx.input.sku}\`.`
      };
    }

    requireReplacementContent(ctx.input);

    if (ctx.input.action === 'add') {
      if (!ctx.input.imageBase64 || !ctx.input.mimeType || !ctx.input.fileName) {
        throw magentoServiceError(
          'imageBase64, mimeType, and fileName are required for add action'
        );
      }

      let mediaId = await client.createProductMedia(ctx.input.sku, {
        media_type: 'image',
        label: ctx.input.label,
        position: ctx.input.position,
        disabled: ctx.input.disabled,
        types: ctx.input.types,
        content: {
          base64_encoded_data: ctx.input.imageBase64,
          type: ctx.input.mimeType,
          name: ctx.input.fileName
        }
      });

      return {
        output: { mediaId: String(mediaId) },
        message: `Added media entry **${mediaId}** to SKU \`${ctx.input.sku}\`.`
      };
    }

    if (ctx.input.entryId === undefined) {
      throw magentoServiceError('entryId is required for update action');
    }

    let mediaEntry: Record<string, any> = {
      media_type: 'image'
    };
    if (ctx.input.label !== undefined) mediaEntry.label = ctx.input.label;
    if (ctx.input.position !== undefined) mediaEntry.position = ctx.input.position;
    if (ctx.input.disabled !== undefined) mediaEntry.disabled = ctx.input.disabled;
    if (ctx.input.types !== undefined) mediaEntry.types = ctx.input.types;
    if (ctx.input.imageBase64 && ctx.input.mimeType && ctx.input.fileName) {
      mediaEntry.content = {
        base64_encoded_data: ctx.input.imageBase64,
        type: ctx.input.mimeType,
        name: ctx.input.fileName
      };
    }

    await client.updateProductMedia(ctx.input.sku, ctx.input.entryId, mediaEntry);
    return {
      output: {
        success: true,
        media: mapMedia({ ...mediaEntry, id: ctx.input.entryId })
      },
      message: `Updated media entry \`${ctx.input.entryId}\` for SKU \`${ctx.input.sku}\`.`
    };
  })
  .build();

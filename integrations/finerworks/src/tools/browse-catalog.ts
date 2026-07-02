import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let browseCatalog = SlateTool.create(spec, {
  name: 'Browse Product Catalog',
  key: 'browse_catalog',
  description: `Browse FinerWorks' product catalog including product types, media types, and style types. Product types define categories (e.g., canvas, posters). Media types specify printing surfaces within a product type. Style types define mounting and sizing options. Use this to discover available products before placing orders.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      catalogType: z
        .enum(['product_types', 'media_types', 'style_types'])
        .describe('Type of catalog to browse: product_types, media_types, or style_types'),
      filterIds: z.array(z.number()).optional().describe('Optional IDs to filter results')
    })
  )
  .output(
    z.object({
      productTypes: z
        .array(
          z.object({
            typeId: z.number().describe('Product type ID'),
            name: z.string().describe('Product type name'),
            description: z.string().optional().describe('Product type description'),
            mediaIds: z.array(z.number()).optional().describe('Associated media type IDs')
          })
        )
        .optional()
        .describe('Product types (when catalogType is product_types)'),
      mediaTypes: z
        .array(
          z.object({
            typeId: z.number().describe('Media type ID'),
            productTypeId: z.number().describe('Parent product type ID'),
            name: z.string().describe('Media type name'),
            description: z.string().optional().describe('Media type description'),
            styleIds: z.array(z.number()).optional().describe('Associated style type IDs')
          })
        )
        .optional()
        .describe('Media types (when catalogType is media_types)'),
      styleTypes: z
        .array(
          z.object({
            typeId: z.number().describe('Style type ID'),
            name: z.string().describe('Style type name'),
            description: z.string().optional().describe('Style type description'),
            canFrame: z.boolean().optional().describe('Whether framing is available'),
            canMat: z.boolean().optional().describe('Whether matting is available'),
            frameClassIds: z
              .array(z.number())
              .optional()
              .describe('Available frame class IDs'),
            customSizing: z
              .boolean()
              .optional()
              .describe('Whether custom sizing is supported'),
            minWidth: z.number().optional().describe('Minimum width'),
            minHeight: z.number().optional().describe('Minimum height'),
            maxWidth: z.number().optional().describe('Maximum width'),
            maxHeight: z.number().optional().describe('Maximum height'),
            availableSizes: z
              .array(
                z.object({
                  width: z.number().describe('Width'),
                  height: z.number().describe('Height')
                })
              )
              .optional()
              .describe('Available preset sizes')
          })
        )
        .optional()
        .describe('Style types (when catalogType is style_types)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      webApiKey: ctx.auth.webApiKey,
      appKey: ctx.auth.appKey,
      testMode: ctx.config.testMode
    });

    let ids = ctx.input.filterIds;

    if (ctx.input.catalogType === 'product_types') {
      let data = await client.listProductTypes(ids);
      if (!data.status?.success)
        throw new Error(data.status?.message || 'Failed to list product types');

      let productTypes = (data.product_types ?? []).map((pt: any) => ({
        typeId: pt.id,
        name: pt.name ?? '',
        description: pt.description || undefined,
        mediaIds: pt.media_ids ?? []
      }));

      return {
        output: { productTypes },
        message: `Found **${productTypes.length}** product type(s): ${productTypes.map((pt: any) => pt.name).join(', ')}`
      };
    }

    if (ctx.input.catalogType === 'media_types') {
      let data = await client.listMediaTypes(ids);
      if (!data.status?.success)
        throw new Error(data.status?.message || 'Failed to list media types');

      let mediaTypes = (data.media_types ?? []).map((mt: any) => ({
        typeId: mt.id,
        productTypeId: mt.product_type_id,
        name: mt.name ?? '',
        description: mt.description || undefined,
        styleIds: mt.style_ids ?? []
      }));

      return {
        output: { mediaTypes },
        message: `Found **${mediaTypes.length}** media type(s): ${mediaTypes.map((mt: any) => mt.name).join(', ')}`
      };
    }

    // style_types
    let data = await client.listStyleTypes(ids);
    if (!data.status?.success)
      throw new Error(data.status?.message || 'Failed to list style types');

    let styleTypes = (data.style_types ?? []).map((st: any) => ({
      typeId: st.id,
      name: st.name ?? '',
      description: st.description || undefined,
      canFrame: st.can_frame,
      canMat: st.can_mat,
      frameClassIds: st.frame_class_ids ?? [],
      customSizing: st.custom_sizing,
      minWidth: st.min?.width,
      minHeight: st.min?.height,
      maxWidth: st.max?.width,
      maxHeight: st.max?.height,
      availableSizes: (st.available_sizes ?? []).map((s: any) => ({
        width: s.width,
        height: s.height
      }))
    }));

    return {
      output: { styleTypes },
      message: `Found **${styleTypes.length}** style type(s): ${styleTypes.map((st: any) => st.name).join(', ')}`
    };
  })
  .build();

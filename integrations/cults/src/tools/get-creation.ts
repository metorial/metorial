import { SlateTool } from 'slates';
import { z } from 'zod';
import { CultsClient } from '../lib/client';
import { spec } from '../spec';

let illustrationSchema = z.object({
  imageUrl: z.string().nullable().describe('Image URL'),
  position: z.number().nullable().describe('Display position')
});

let blueprintSchema = z.object({
  blueprintId: z.string().nullable().describe('Blueprint ID'),
  fileUrl: z.string().nullable().describe('File URL (only for own creations)'),
  imageUrl: z.string().nullable().describe('Preview image URL'),
  position: z.number().nullable().describe('Display position')
});

let metaTagSchema = z.object({
  code: z.string().describe('Meta tag code'),
  name: z.string().nullable().describe('Meta tag display name')
});

export let getCreation = SlateTool.create(spec, {
  name: 'Get Creation',
  key: 'get_creation',
  description: `Get detailed information about a specific 3D design on Cults3D by its slug. Returns full details including description, images, files, pricing, discount, tags, license, creator info, and sales statistics.`,
  instructions: [
    'The slug is the URL-friendly identifier found in the creation URL, e.g. "my-3d-model" from "https://cults3d.com/en/3d-model/my-3d-model"'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      slug: z.string().describe('URL slug of the creation (e.g. "my-3d-model")')
    })
  )
  .output(
    z.object({
      identifier: z.string().describe('Unique identifier of the creation'),
      name: z.string().nullable().describe('Name of the creation'),
      url: z.string().nullable().describe('Full URL'),
      shortUrl: z.string().nullable().describe('Short URL'),
      publishedAt: z.string().nullable().describe('Publication date'),
      description: z.string().nullable().describe('Full description'),
      illustrationImageUrl: z.string().nullable().describe('Cover image URL'),
      downloadsCount: z.number().nullable().describe('Number of downloads'),
      likesCount: z.number().nullable().describe('Number of likes'),
      viewsCount: z.number().nullable().describe('Number of views'),
      madeWithAi: z.boolean().nullable().describe('Whether the design was made with AI'),
      visibility: z
        .string()
        .nullable()
        .describe('Visibility state (public/secret/deactivated)'),
      tags: z.array(z.string()).nullable().describe('Tags'),
      metaTags: z.array(metaTagSchema).nullable().describe('Meta tags'),
      creatorNick: z.string().nullable().describe('Creator username'),
      creatorImageUrl: z.string().nullable().describe('Creator avatar URL'),
      categoryId: z.string().nullable().describe('Category ID'),
      categoryName: z.string().nullable().describe('Category name'),
      licenseCode: z.string().nullable().describe('License code'),
      licenseName: z.string().nullable().describe('License name'),
      priceUsd: z.number().nullable().describe('Price in USD'),
      discountPercentage: z.number().nullable().describe('Discount percentage'),
      discountEndAt: z.string().nullable().describe('Discount expiration'),
      originalPriceUsd: z.number().nullable().describe('Original price before discount'),
      totalSalesAmountUsd: z.number().nullable().describe('Total sales revenue in USD'),
      illustrations: z.array(illustrationSchema).describe('Images attached to the creation'),
      blueprints: z.array(blueprintSchema).describe('3D model files attached')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CultsClient({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let c = await client.getCreation(ctx.input.slug);

    if (!c) {
      throw new Error(`Creation with slug "${ctx.input.slug}" not found`);
    }

    let output = {
      identifier: c.identifier,
      name: c.name,
      url: c.url,
      shortUrl: c.shortUrl,
      publishedAt: c.publishedAt,
      description: c.description,
      illustrationImageUrl: c.illustrationImageUrl,
      downloadsCount: c.downloadsCount,
      likesCount: c.likesCount,
      viewsCount: c.viewsCount,
      madeWithAi: c.madeWithAi,
      visibility: c.visibility,
      tags: c.tags,
      metaTags: c.metaTags ?? [],
      creatorNick: c.creator?.nick ?? null,
      creatorImageUrl: c.creator?.imageUrl ?? null,
      categoryId: c.category?.id ?? null,
      categoryName: c.category?.name ?? null,
      licenseCode: c.license?.code ?? null,
      licenseName: c.license?.name ?? null,
      priceUsd: c.price?.value ?? null,
      discountPercentage: c.discount?.percentage ?? null,
      discountEndAt: c.discount?.endAt ?? null,
      originalPriceUsd: c.discount?.originalPrice?.value ?? null,
      totalSalesAmountUsd: c.totalSalesAmount?.value ?? null,
      illustrations: (c.illustrations ?? []).map((i: any) => ({
        imageUrl: i.imageUrl,
        position: i.position
      })),
      blueprints: (c.blueprints ?? []).map((b: any) => ({
        blueprintId: b.id,
        fileUrl: b.fileUrl,
        imageUrl: b.imageUrl,
        position: b.position
      }))
    };

    return {
      output,
      message: `Retrieved creation **${c.name ?? ctx.input.slug}** by ${c.creator?.nick ?? 'unknown'}. ${c.downloadsCount ?? 0} downloads, ${c.likesCount ?? 0} likes.`
    };
  })
  .build();

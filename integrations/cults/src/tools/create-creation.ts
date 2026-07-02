import { SlateTool } from 'slates';
import { z } from 'zod';
import { CultsClient } from '../lib/client';
import { spec } from '../spec';

export let createCreation = SlateTool.create(spec, {
  name: 'Create Creation',
  key: 'create_creation',
  description: `Publish a new 3D design on Cults3D. Provide a name, description, category, at least one image URL, and at least one file URL. Optionally set price, license, tags, and AI flag. Returns the newly created design's identifier and URL.`,
  instructions: [
    'Image and file URLs must be publicly accessible HTTPS URLs with proper file extensions (e.g. .stl, .jpg)',
    'Maximum 10 URLs each for imageUrls and fileUrls',
    'Use the Get Categories tool to find valid category IDs',
    'Use the Get Licenses tool or known codes like "cults_cu", "cults_cu_nd"'
  ],
  constraints: ['Maximum 10 image URLs and 10 file URLs per creation'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Title of the design'),
      description: z.string().describe('Full description (HTML supported)'),
      imageUrls: z.array(z.string()).min(1).max(10).describe('HTTPS URLs for preview images'),
      fileUrls: z.array(z.string()).min(1).max(10).describe('HTTPS URLs for 3D model files'),
      categoryId: z.string().describe('Category ID (base64 opaque ID from Get Categories)'),
      subCategoryIds: z.array(z.string()).optional().describe('Sub-category IDs'),
      downloadPrice: z.number().optional().describe('Price for download (omit or 0 for free)'),
      currency: z.enum(['USD', 'EUR']).optional().describe('Currency for the price'),
      licenseCode: z
        .string()
        .optional()
        .describe('License code (e.g. "cults_cu", "cults_cu_nd")'),
      tagNames: z.array(z.string()).optional().describe('Tags for the creation'),
      metaTags: z.array(z.string()).optional().describe('Meta tags (e.g. "3DP_TOOLTIP")'),
      madeWithAi: z
        .boolean()
        .optional()
        .describe('Whether the design was made with AI assistance')
    })
  )
  .output(
    z.object({
      identifier: z.string().describe('Identifier of the new creation'),
      name: z.string().nullable().describe('Name of the creation'),
      url: z.string().nullable().describe('Full URL to the creation page'),
      shortUrl: z.string().nullable().describe('Short URL for sharing')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CultsClient({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let creation = await client.createCreation({
      name: ctx.input.name,
      description: ctx.input.description,
      imageUrls: ctx.input.imageUrls,
      fileUrls: ctx.input.fileUrls,
      categoryId: ctx.input.categoryId,
      subCategoryIds: ctx.input.subCategoryIds,
      downloadPrice: ctx.input.downloadPrice,
      currency: ctx.input.currency,
      locale: 'EN',
      licenseCode: ctx.input.licenseCode,
      tagNames: ctx.input.tagNames,
      metaTags: ctx.input.metaTags,
      madeWithAi: ctx.input.madeWithAi
    });

    return {
      output: {
        identifier: creation.identifier,
        name: creation.name,
        url: creation.url,
        shortUrl: creation.shortUrl
      },
      message: `Created new design **${creation.name ?? ctx.input.name}**. URL: ${creation.url ?? creation.shortUrl ?? 'N/A'}`
    };
  })
  .build();

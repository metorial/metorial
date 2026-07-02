import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let imageProductSchema = z.object({
  sku: z.string().describe('Product SKU'),
  productCode: z.string().nullable().optional().describe('Product code'),
  perItemPrice: z.number().optional().describe('Price per item'),
  totalPrice: z.number().optional().describe('Total price'),
  askingPrice: z.number().optional().describe('Listed asking price'),
  imageGuid: z.string().optional().describe('Associated image GUID')
});

let imageSchema = z.object({
  imageId: z.number().optional().describe('Image ID'),
  guid: z.string().describe('Unique image GUID'),
  title: z.string().optional().describe('Image title'),
  description: z.string().optional().describe('Image description'),
  fileName: z.string().optional().describe('Original file name'),
  fileSize: z.number().optional().describe('File size in bytes'),
  thumbnailUrl: z.string().optional().describe('Public thumbnail URL'),
  previewUrl: z.string().optional().describe('Public preview URL'),
  hiresUrl: z.string().optional().describe('Private high-resolution URL'),
  pixelWidth: z.number().optional().describe('Image width in pixels'),
  pixelHeight: z.number().optional().describe('Image height in pixels'),
  dateAdded: z.string().optional().describe('Date the image was uploaded'),
  active: z.boolean().optional().describe('Whether the image is active'),
  products: z
    .array(imageProductSchema)
    .optional()
    .describe('Associated virtual inventory products')
});

export let listImages = SlateTool.create(spec, {
  name: 'List Images',
  key: 'list_images',
  description: `List image files in your FinerWorks image library. Supports pagination, search filtering, date range filtering, and sorting. Optionally includes associated virtual inventory products for each image.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchFilter: z.string().optional().describe('Search text to filter images'),
      guidFilter: z.string().optional().describe('Filter by specific image GUID'),
      pageNumber: z.number().int().min(1).optional().default(1).describe('Page number'),
      perPage: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(25)
        .describe('Results per page'),
      sortField: z
        .enum(['id', 'title', 'date_added'])
        .optional()
        .default('id')
        .describe('Field to sort by'),
      sortDirection: z
        .enum(['ASC', 'DESC'])
        .optional()
        .default('DESC')
        .describe('Sort direction'),
      uploadDateFrom: z
        .string()
        .optional()
        .describe('Filter images uploaded after this date (ISO 8601)'),
      uploadDateTo: z
        .string()
        .optional()
        .describe('Filter images uploaded before this date (ISO 8601)'),
      includeProducts: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include associated virtual inventory products'),
      activeOnly: z.boolean().optional().describe('Filter by active status')
    })
  )
  .output(
    z.object({
      images: z.array(imageSchema).describe('Image files'),
      pageNumber: z.number().describe('Current page number'),
      perPage: z.number().describe('Results per page'),
      totalCount: z.number().describe('Total number of images')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      webApiKey: ctx.auth.webApiKey,
      appKey: ctx.auth.appKey,
      testMode: ctx.config.testMode
    });

    let data = await client.listImages({
      searchFilter: ctx.input.searchFilter,
      guidFilter: ctx.input.guidFilter ?? null,
      pageNumber: ctx.input.pageNumber,
      perPage: ctx.input.perPage,
      sortField: ctx.input.sortField,
      sortDirection: ctx.input.sortDirection,
      uploadDateFrom: ctx.input.uploadDateFrom ?? null,
      uploadDateTo: ctx.input.uploadDateTo ?? null,
      listProducts: ctx.input.includeProducts,
      active: ctx.input.activeOnly ?? null
    });

    if (!data.status?.success) {
      throw new Error(data.status?.message || 'Failed to list images');
    }

    let images = (data.images ?? []).map((img: any) => ({
      imageId: img.id,
      guid: img.guid ?? '',
      title: img.title || undefined,
      description: img.description || undefined,
      fileName: img.file_name || undefined,
      fileSize: img.file_size || undefined,
      thumbnailUrl: img.public_thumbnail_uri || undefined,
      previewUrl: img.public_preview_uri || undefined,
      hiresUrl: img.private_hires_uri || undefined,
      pixelWidth: img.pix_w || undefined,
      pixelHeight: img.pix_h || undefined,
      dateAdded: img.date_added || undefined,
      active: img.active,
      products: (img.products ?? []).map((p: any) => ({
        sku: p.sku ?? '',
        productCode: p.product_code,
        perItemPrice: p.per_item_price,
        totalPrice: p.total_price,
        askingPrice: p.asking_price,
        imageGuid: p.image_guid
      }))
    }));

    return {
      output: {
        images,
        pageNumber: data.page_number ?? ctx.input.pageNumber ?? 1,
        perPage: data.per_page ?? ctx.input.perPage ?? 25,
        totalCount: data.count ?? 0
      },
      message: `Found **${images.length}** image(s) (page ${ctx.input.pageNumber ?? 1}, ${data.count ?? 0} total). ${images
        .slice(0, 5)
        .map((i: any) => `"${i.title ?? i.fileName ?? i.guid}"`)
        .join(', ')}${images.length > 5 ? '...' : ''}`
    };
  })
  .build();

export let addImages = SlateTool.create(spec, {
  name: 'Add Images',
  key: 'add_images',
  description: `Upload images to your FinerWorks image library by providing URLs to your image files. Each image requires at least a high-resolution URL, title, and pixel dimensions. Up to 5 images can be added at once.`,
  constraints: ['Maximum of 5 images per request'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      images: z
        .array(
          z.object({
            title: z.string().describe('Image title'),
            description: z.string().optional().describe('Image description'),
            fileName: z.string().describe('File name (e.g., "myimage.jpg")'),
            fileSize: z.number().optional().describe('File size in bytes'),
            publicThumbnailUri: z.string().optional().describe('Public URL for the thumbnail'),
            publicPreviewUri: z.string().optional().describe('Public URL for the preview'),
            privateHiresUri: z
              .string()
              .describe('URL to the high-resolution image file for printing'),
            pixelWidth: z.number().int().describe('Image width in pixels'),
            pixelHeight: z.number().int().describe('Image height in pixels')
          })
        )
        .min(1)
        .max(5)
        .describe('Images to add')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the upload was successful'),
      images: z.array(imageSchema).optional().describe('Uploaded images with assigned GUIDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      webApiKey: ctx.auth.webApiKey,
      appKey: ctx.auth.appKey,
      testMode: ctx.config.testMode
    });

    let apiImages = ctx.input.images.map(img => ({
      title: img.title,
      description: img.description ?? '',
      file_name: img.fileName,
      file_size: img.fileSize ?? 0,
      thumbnail_file_name: '',
      preview_file_name: '',
      hires_file_name: '',
      public_thumbnail_uri: img.publicThumbnailUri ?? '',
      public_preview_uri: img.publicPreviewUri ?? '',
      private_hires_uri: img.privateHiresUri,
      pix_w: img.pixelWidth,
      pix_h: img.pixelHeight
    }));

    let data = await client.addImages(apiImages);
    let success = data.status?.success ?? false;

    let images = (data.images ?? []).map((img: any) => ({
      imageId: img.id,
      guid: img.guid ?? '',
      title: img.title || undefined,
      description: img.description || undefined,
      fileName: img.file_name || undefined,
      fileSize: img.file_size || undefined,
      thumbnailUrl: img.public_thumbnail_uri || undefined,
      previewUrl: img.public_preview_uri || undefined,
      hiresUrl: img.private_hires_uri || undefined,
      pixelWidth: img.pix_w || undefined,
      pixelHeight: img.pix_h || undefined,
      dateAdded: img.date_added || undefined,
      active: img.active,
      products: []
    }));

    return {
      output: { success, images },
      message: success
        ? `Successfully added **${images.length}** image(s): ${images.map((i: any) => `"${i.title}" (${i.guid})`).join(', ')}`
        : `Failed to add images: ${data.status?.message ?? 'Unknown error'}`
    };
  })
  .build();

export let updateImages = SlateTool.create(spec, {
  name: 'Update Images',
  key: 'update_images',
  description: `Update the title and description of images in your FinerWorks library. **Warning:** Updating images assigned to the inventory library will also remove any virtual inventory products assigned to those images.`,
  instructions: [
    'Updating an image assigned to inventory will remove associated virtual inventory products'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      images: z
        .array(
          z.object({
            guid: z.string().describe('Image GUID to update'),
            title: z.string().optional().describe('New image title'),
            description: z.string().optional().describe('New image description')
          })
        )
        .min(1)
        .describe('Images to update')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful'),
      message: z.string().optional().describe('API response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      webApiKey: ctx.auth.webApiKey,
      appKey: ctx.auth.appKey,
      testMode: ctx.config.testMode
    });

    let data = await client.updateImages(ctx.input.images);
    let success = data.status?.success ?? false;

    return {
      output: {
        success,
        message: data.status?.message || undefined
      },
      message: success
        ? `Updated **${ctx.input.images.length}** image(s): ${ctx.input.images.map(i => `\`${i.guid}\``).join(', ')}`
        : `Failed to update images: ${data.status?.message ?? 'Unknown error'}`
    };
  })
  .build();

export let deleteImages = SlateTool.create(spec, {
  name: 'Delete Images',
  key: 'delete_images',
  description: `Delete images from your FinerWorks library by their GUIDs. **Warning:** Deleting images assigned to the inventory library will also remove any virtual inventory products assigned to those images.`,
  instructions: [
    'Deleting an image assigned to inventory will also remove associated virtual inventory products'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      imageGuids: z.array(z.string()).min(1).describe('GUIDs of images to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful'),
      message: z.string().optional().describe('API response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      webApiKey: ctx.auth.webApiKey,
      appKey: ctx.auth.appKey,
      testMode: ctx.config.testMode
    });

    let data = await client.deleteImages(ctx.input.imageGuids);
    let success = data.status?.success ?? false;

    return {
      output: {
        success,
        message: data.status?.message || undefined
      },
      message: success
        ? `Deleted **${ctx.input.imageGuids.length}** image(s)`
        : `Failed to delete images: ${data.status?.message ?? 'Unknown error'}`
    };
  })
  .build();

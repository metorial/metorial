import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getImageTool = SlateTool.create(spec, {
  name: 'Get Image',
  key: 'get_image',
  description: `Retrieve detailed information about a SmugMug image or video, including metadata, EXIF data, and available size variants. Provides title, caption, keywords, upload date, dimensions, and download URLs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      imageKey: z.string().describe('Image key to retrieve'),
      includeMetadata: z.boolean().optional().describe('Include EXIF/metadata details'),
      includeSizes: z.boolean().optional().describe('Include available size variants and URLs')
    })
  )
  .output(
    z.object({
      imageKey: z.string().describe('Image key'),
      title: z.string().optional().describe('Image title'),
      caption: z.string().optional().describe('Image caption'),
      keywords: z.string().optional().describe('Semicolon-separated keywords'),
      fileName: z.string().optional().describe('Original filename'),
      format: z.string().optional().describe('Image format'),
      webUri: z.string().optional().describe('Web URL'),
      dateUploaded: z.string().optional().describe('Upload date'),
      lastUpdated: z.string().optional().describe('Last updated timestamp'),
      latitude: z.number().optional().describe('GPS latitude'),
      longitude: z.number().optional().describe('GPS longitude'),
      altitude: z.number().optional().describe('GPS altitude'),
      hidden: z.boolean().optional().describe('Whether the image is hidden'),
      originalWidth: z.number().optional().describe('Original width in pixels'),
      originalHeight: z.number().optional().describe('Original height in pixels'),
      originalSize: z.number().optional().describe('Original file size in bytes'),
      archivedUri: z
        .string()
        .optional()
        .describe('Download URL for the original/archive image'),
      metadata: z.record(z.string(), z.any()).optional().describe('EXIF metadata'),
      sizes: z.record(z.string(), z.any()).optional().describe('Available size variants')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      tokenSecret: ctx.auth.tokenSecret,
      consumerKey: ctx.auth.consumerKey,
      consumerSecret: ctx.auth.consumerSecret
    });

    let image = await client.getImage(ctx.input.imageKey);

    let metadata: any;
    if (ctx.input.includeMetadata) {
      try {
        metadata = await client.getImageMetadata(ctx.input.imageKey);
      } catch {
        ctx.warn('Failed to retrieve image metadata');
      }
    }

    let sizes: any;
    if (ctx.input.includeSizes) {
      try {
        sizes = await client.getImageSizes(ctx.input.imageKey);
      } catch {
        ctx.warn('Failed to retrieve image sizes');
      }
    }

    return {
      output: {
        imageKey: image?.ImageKey || ctx.input.imageKey,
        title: image?.Title || undefined,
        caption: image?.Caption || undefined,
        keywords: image?.Keywords || undefined,
        fileName: image?.FileName || undefined,
        format: image?.Format || undefined,
        webUri: image?.WebUri || undefined,
        dateUploaded: image?.Date || undefined,
        lastUpdated: image?.LastUpdated || undefined,
        latitude: image?.Latitude || undefined,
        longitude: image?.Longitude || undefined,
        altitude: image?.Altitude || undefined,
        hidden: image?.Hidden || undefined,
        originalWidth: image?.OriginalWidth || undefined,
        originalHeight: image?.OriginalHeight || undefined,
        originalSize: image?.OriginalSize || undefined,
        archivedUri: image?.ArchivedUri || undefined,
        metadata,
        sizes
      },
      message: `Retrieved image **${image?.Title || image?.FileName || ctx.input.imageKey}**`
    };
  })
  .build();

export let updateImageTool = SlateTool.create(spec, {
  name: 'Update Image',
  key: 'update_image',
  description: `Update properties of an image on SmugMug. Modify title, caption, keywords, geolocation, visibility, and watermark settings.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      imageKey: z.string().describe('Image key to update'),
      title: z.string().optional().describe('New title'),
      caption: z.string().optional().describe('New caption'),
      keywords: z.string().optional().describe('New keywords (semicolon-separated)'),
      latitude: z.number().optional().describe('GPS latitude'),
      longitude: z.number().optional().describe('GPS longitude'),
      altitude: z.number().optional().describe('GPS altitude'),
      hidden: z.boolean().optional().describe('Whether to hide the image')
    })
  )
  .output(
    z.object({
      imageKey: z.string().describe('Image key'),
      title: z.string().optional().describe('Updated title'),
      caption: z.string().optional().describe('Updated caption'),
      keywords: z.string().optional().describe('Updated keywords'),
      lastUpdated: z.string().optional().describe('Last updated timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      tokenSecret: ctx.auth.tokenSecret,
      consumerKey: ctx.auth.consumerKey,
      consumerSecret: ctx.auth.consumerSecret
    });

    let imageData: Record<string, any> = {};
    if (ctx.input.title !== undefined) imageData.Title = ctx.input.title;
    if (ctx.input.caption !== undefined) imageData.Caption = ctx.input.caption;
    if (ctx.input.keywords !== undefined) imageData.Keywords = ctx.input.keywords;
    if (ctx.input.latitude !== undefined) imageData.Latitude = ctx.input.latitude;
    if (ctx.input.longitude !== undefined) imageData.Longitude = ctx.input.longitude;
    if (ctx.input.altitude !== undefined) imageData.Altitude = ctx.input.altitude;
    if (ctx.input.hidden !== undefined) imageData.Hidden = ctx.input.hidden;

    let image = await client.updateImage(ctx.input.imageKey, imageData);

    return {
      output: {
        imageKey: image?.ImageKey || ctx.input.imageKey,
        title: image?.Title || undefined,
        caption: image?.Caption || undefined,
        keywords: image?.Keywords || undefined,
        lastUpdated: image?.LastUpdated || undefined
      },
      message: `Updated image **${image?.Title || ctx.input.imageKey}**`
    };
  })
  .build();

export let deleteImageTool = SlateTool.create(spec, {
  name: 'Delete Image',
  key: 'delete_image',
  description: `Permanently delete an image or video from SmugMug. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      imageKey: z.string().describe('Image key to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the image was successfully deleted'),
      imageKey: z.string().describe('The deleted image key')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      tokenSecret: ctx.auth.tokenSecret,
      consumerKey: ctx.auth.consumerKey,
      consumerSecret: ctx.auth.consumerSecret
    });

    await client.deleteImage(ctx.input.imageKey);

    return {
      output: {
        deleted: true,
        imageKey: ctx.input.imageKey
      },
      message: `Deleted image **${ctx.input.imageKey}**`
    };
  })
  .build();

export let uploadImageTool = SlateTool.create(spec, {
  name: 'Upload Image from URL',
  key: 'upload_image_from_url',
  description: `Upload an image or video to a SmugMug album from an external URL. The file is downloaded from the URL and uploaded to the specified album. Optionally set title, caption, keywords, and other metadata during upload.`,
  constraints: [
    'The source URL must be publicly accessible.',
    'Supported formats include JPEG, PNG, GIF, TIFF, BMP, and common video formats.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      albumUri: z.string().describe('Album API URI (e.g., "/api/v2/album/ABC123")'),
      sourceUrl: z.string().describe('URL of the image or video to upload'),
      fileName: z.string().optional().describe('Custom filename on SmugMug'),
      title: z.string().optional().describe('Image title'),
      caption: z.string().optional().describe('Image caption'),
      keywords: z.string().optional().describe('Keywords (semicolon-separated)'),
      hidden: z.boolean().optional().describe('Whether to hide the image'),
      replaceImageUri: z.string().optional().describe('URI of an existing image to replace')
    })
  )
  .output(
    z.object({
      imageUri: z.string().optional().describe('API URI of the uploaded image'),
      albumImageUri: z.string().optional().describe('Album-image relationship URI'),
      imageUrl: z.string().optional().describe('Public URL of the uploaded image'),
      status: z.string().describe('Upload status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      tokenSecret: ctx.auth.tokenSecret,
      consumerKey: ctx.auth.consumerKey,
      consumerSecret: ctx.auth.consumerSecret
    });

    let result = await client.uploadImageFromUrl(ctx.input.albumUri, ctx.input.sourceUrl, {
      fileName: ctx.input.fileName,
      title: ctx.input.title,
      caption: ctx.input.caption,
      keywords: ctx.input.keywords,
      hidden: ctx.input.hidden,
      replaceImageUri: ctx.input.replaceImageUri
    });

    return {
      output: {
        imageUri: result?.Image?.ImageUri || undefined,
        albumImageUri: result?.Image?.AlbumImageUri || undefined,
        imageUrl: result?.Image?.URL || undefined,
        status: result?.stat || 'unknown'
      },
      message: `Uploaded image to album${ctx.input.title ? ` with title **${ctx.input.title}**` : ''}`
    };
  })
  .build();

export let moveImagesTool = SlateTool.create(spec, {
  name: 'Move or Collect Images',
  key: 'move_or_collect_images',
  description: `Move or collect (copy) images between SmugMug albums. **Move** transfers images from their current album to a target album. **Collect** adds images to an additional album without removing them from the original.`,
  instructions: [
    'Use "move" action to transfer images between albums.',
    'Use "collect" action to add images to a second album while keeping them in the original.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['move', 'collect'])
        .describe('Whether to move or collect (copy) the images'),
      targetAlbumKey: z.string().describe('Album key of the destination album'),
      imageUris: z
        .array(z.string())
        .describe(
          'Array of image API URIs to move or collect (e.g., ["/api/v2/image/ABC123"])'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation completed successfully'),
      action: z.string().describe('Action performed'),
      targetAlbumKey: z.string().describe('Destination album key'),
      imageCount: z.number().describe('Number of images processed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      tokenSecret: ctx.auth.tokenSecret,
      consumerKey: ctx.auth.consumerKey,
      consumerSecret: ctx.auth.consumerSecret
    });

    if (ctx.input.action === 'collect') {
      for (let imageUri of ctx.input.imageUris) {
        await client.collectImage(ctx.input.targetAlbumKey, imageUri);
      }
    } else {
      let targetAlbumUri = `/api/v2/album/${ctx.input.targetAlbumKey}`;
      await client.moveImages(targetAlbumUri, ctx.input.imageUris);
    }

    return {
      output: {
        success: true,
        action: ctx.input.action,
        targetAlbumKey: ctx.input.targetAlbumKey,
        imageCount: ctx.input.imageUris.length
      },
      message: `${ctx.input.action === 'move' ? 'Moved' : 'Collected'} ${ctx.input.imageUris.length} image(s) to album **${ctx.input.targetAlbumKey}**`
    };
  })
  .build();

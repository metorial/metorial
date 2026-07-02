import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAlbumImagesTool = SlateTool.create(spec, {
  name: 'List Album Images',
  key: 'list_album_images',
  description: `List all images and videos in a SmugMug album with pagination support. Returns image metadata including title, caption, filename, upload date, and web URL for each image.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      albumKey: z.string().describe('Album key to list images from'),
      start: z.number().optional().describe('Starting index (1-based) for pagination'),
      count: z.number().optional().describe('Number of images to return (max 100)')
    })
  )
  .output(
    z.object({
      images: z
        .array(
          z.object({
            imageKey: z.string().describe('Image key'),
            title: z.string().optional().describe('Image title'),
            caption: z.string().optional().describe('Image caption'),
            fileName: z.string().optional().describe('Original filename'),
            format: z.string().optional().describe('File format'),
            webUri: z.string().optional().describe('Web URL'),
            dateUploaded: z.string().optional().describe('Upload date'),
            lastUpdated: z.string().optional().describe('Last updated timestamp'),
            hidden: z.boolean().optional().describe('Whether the image is hidden'),
            keywords: z.string().optional().describe('Keywords')
          })
        )
        .describe('Images in the album'),
      totalImages: z.number().describe('Total number of images in the album'),
      start: z.number().describe('Current start index'),
      count: z.number().describe('Number of images returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      tokenSecret: ctx.auth.tokenSecret,
      consumerKey: ctx.auth.consumerKey,
      consumerSecret: ctx.auth.consumerSecret
    });

    let result = await client.getAlbumImages(ctx.input.albumKey, {
      start: ctx.input.start,
      count: ctx.input.count
    });

    let images = result.items.map((img: any) => ({
      imageKey: img.ImageKey || '',
      title: img.Title || undefined,
      caption: img.Caption || undefined,
      fileName: img.FileName || undefined,
      format: img.Format || undefined,
      webUri: img.WebUri || undefined,
      dateUploaded: img.Date || undefined,
      lastUpdated: img.LastUpdated || undefined,
      hidden: img.Hidden || undefined,
      keywords: img.Keywords || undefined
    }));

    return {
      output: {
        images,
        totalImages: result.pages.total,
        start: ctx.input.start || 1,
        count: images.length
      },
      message: `Listed **${images.length}** of ${result.pages.total} images in album **${ctx.input.albumKey}**`
    };
  })
  .build();

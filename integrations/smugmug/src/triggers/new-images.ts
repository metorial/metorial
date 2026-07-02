import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newImagesTrigger = SlateTrigger.create(spec, {
  name: 'New Image Uploaded',
  key: 'new_image_in_album',
  description:
    "Triggers when a new image or video is uploaded to any album on the authenticated SmugMug account. Polls the user's recent images and detects new uploads by tracking known image keys."
})
  .input(
    z.object({
      imageKey: z.string().describe('Image key'),
      title: z.string().optional().describe('Image title'),
      caption: z.string().optional().describe('Image caption'),
      fileName: z.string().optional().describe('Original filename'),
      webUri: z.string().optional().describe('Web URL'),
      dateUploaded: z.string().optional().describe('Upload date'),
      keywords: z.string().optional().describe('Image keywords'),
      albumKey: z.string().optional().describe('Album key this image belongs to')
    })
  )
  .output(
    z.object({
      imageKey: z.string().describe('Image key'),
      title: z.string().optional().describe('Image title'),
      caption: z.string().optional().describe('Image caption'),
      fileName: z.string().optional().describe('Original filename'),
      webUri: z.string().optional().describe('Web URL'),
      dateUploaded: z.string().optional().describe('Upload date'),
      keywords: z.string().optional().describe('Image keywords'),
      albumKey: z.string().optional().describe('Album key')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        tokenSecret: ctx.auth.tokenSecret,
        consumerKey: ctx.auth.consumerKey,
        consumerSecret: ctx.auth.consumerSecret
      });

      let knownImageKeys = ((ctx.input.state as any)?.knownImageKeys || []) as string[];

      // Get the authenticated user to find their recent images
      let user = await client.getAuthenticatedUser();
      let nickname = user?.NickName || '';

      // Get the user's recent images
      let result = await client.getRecentImages(nickname, { count: 100 });
      let allImages = result.items;

      let newImages: any[] = [];
      let currentImageKeys: string[] = [];

      for (let img of allImages) {
        let key = img.ImageKey || '';
        currentImageKeys.push(key);

        if (knownImageKeys.length > 0 && !knownImageKeys.includes(key)) {
          newImages.push(img);
        }
      }

      // On first poll, don't emit events — just record the current state
      if (knownImageKeys.length === 0) {
        return {
          inputs: [],
          updatedState: {
            knownImageKeys: currentImageKeys
          }
        };
      }

      let inputs = newImages.map(img => ({
        imageKey: img.ImageKey || '',
        title: img.Title || undefined,
        caption: img.Caption || undefined,
        fileName: img.FileName || undefined,
        webUri: img.WebUri || undefined,
        dateUploaded: img.Date || undefined,
        keywords: img.Keywords || undefined,
        albumKey: img.AlbumKey || undefined
      }));

      return {
        inputs,
        updatedState: {
          knownImageKeys: currentImageKeys
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'image.created',
        id: `image_${ctx.input.imageKey}_${ctx.input.dateUploaded || Date.now()}`,
        output: {
          imageKey: ctx.input.imageKey,
          title: ctx.input.title,
          caption: ctx.input.caption,
          fileName: ctx.input.fileName,
          webUri: ctx.input.webUri,
          dateUploaded: ctx.input.dateUploaded,
          keywords: ctx.input.keywords,
          albumKey: ctx.input.albumKey
        }
      };
    }
  })
  .build();

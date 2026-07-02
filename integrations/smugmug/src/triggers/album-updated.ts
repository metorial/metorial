import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let albumUpdatedTrigger = SlateTrigger.create(spec, {
  name: 'Album Updated',
  key: 'album_updated',
  description:
    'Triggers when any SmugMug album on the authenticated account is modified, including settings changes and when images are added or removed. Detects changes by comparing album LastUpdated and ImagesLastUpdated timestamps.'
})
  .input(
    z.object({
      albumKey: z.string().describe('Album key'),
      name: z.string().optional().describe('Album name'),
      lastUpdated: z.string().optional().describe('Album last updated timestamp'),
      imagesLastUpdated: z.string().optional().describe('Images last updated timestamp'),
      changeType: z
        .enum(['settings_changed', 'images_changed', 'album_changed'])
        .describe('Type of change detected')
    })
  )
  .output(
    z.object({
      albumKey: z.string().describe('Album key'),
      name: z.string().optional().describe('Album name'),
      webUri: z.string().optional().describe('Album web URL'),
      lastUpdated: z.string().optional().describe('Album last updated timestamp'),
      imagesLastUpdated: z.string().optional().describe('Images last updated timestamp'),
      privacy: z.string().optional().describe('Privacy setting'),
      imageCount: z.number().optional().describe('Current image count'),
      changeType: z
        .string()
        .describe('Type of change: settings_changed, images_changed, or album_changed')
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

      // Track album timestamps from previous poll
      let albumTimestamps = ((ctx.input.state as any)?.albumTimestamps || {}) as Record<
        string,
        { lastUpdated: string; imagesLastUpdated: string }
      >;

      // Get the authenticated user
      let user = await client.getAuthenticatedUser();
      let nickname = user?.NickName || '';

      // Get the user's albums by listing from their user node
      let data = await client.get(`/api/v2/user/${encodeURIComponent(nickname)}!albums`, {
        count: 100
      });
      let albums = data?.Response?.Album || [];

      let currentTimestamps: Record<
        string,
        { lastUpdated: string; imagesLastUpdated: string }
      > = {};
      let inputs: any[] = [];
      let isFirstPoll = Object.keys(albumTimestamps).length === 0;

      for (let album of albums) {
        let albumKey = album.AlbumKey || '';
        let currentLastUpdated = album.LastUpdated || '';
        let currentImagesLastUpdated = album.ImagesLastUpdated || '';

        currentTimestamps[albumKey] = {
          lastUpdated: currentLastUpdated,
          imagesLastUpdated: currentImagesLastUpdated
        };

        // Skip first poll — just record the current state
        if (isFirstPoll) continue;

        let previous = albumTimestamps[albumKey];

        if (!previous) {
          // New album detected
          inputs.push({
            albumKey,
            name: album.Name || undefined,
            lastUpdated: currentLastUpdated,
            imagesLastUpdated: currentImagesLastUpdated,
            changeType: 'album_changed' as const
          });
        } else {
          let settingsChanged = currentLastUpdated !== previous.lastUpdated;
          let imagesChanged = currentImagesLastUpdated !== previous.imagesLastUpdated;

          if (imagesChanged) {
            inputs.push({
              albumKey,
              name: album.Name || undefined,
              lastUpdated: currentLastUpdated,
              imagesLastUpdated: currentImagesLastUpdated,
              changeType: 'images_changed' as const
            });
          } else if (settingsChanged) {
            inputs.push({
              albumKey,
              name: album.Name || undefined,
              lastUpdated: currentLastUpdated,
              imagesLastUpdated: currentImagesLastUpdated,
              changeType: 'settings_changed' as const
            });
          }
        }
      }

      return {
        inputs,
        updatedState: {
          albumTimestamps: currentTimestamps
        }
      };
    },

    handleEvent: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        tokenSecret: ctx.auth.tokenSecret,
        consumerKey: ctx.auth.consumerKey,
        consumerSecret: ctx.auth.consumerSecret
      });

      // Fetch full album data to include in the output
      let album: any;
      try {
        album = await client.getAlbum(ctx.input.albumKey);
      } catch {
        // Use what we have from the input if fetch fails
      }

      return {
        type: `album.${ctx.input.changeType}`,
        id: `album_${ctx.input.albumKey}_${ctx.input.lastUpdated || Date.now()}`,
        output: {
          albumKey: ctx.input.albumKey,
          name: album?.Name || ctx.input.name,
          webUri: album?.WebUri || undefined,
          lastUpdated: ctx.input.lastUpdated,
          imagesLastUpdated: ctx.input.imagesLastUpdated,
          privacy: album?.Privacy || undefined,
          imageCount: album?.ImageCount || undefined,
          changeType: ctx.input.changeType
        }
      };
    }
  })
  .build();

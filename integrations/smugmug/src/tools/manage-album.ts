import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createAlbumTool = SlateTool.create(spec, {
  name: 'Create Album',
  key: 'create_album',
  description: `Create a new album (gallery) in a specified folder on SmugMug. Configure the album name, privacy settings, URL slug, description, sorting, and other properties. The album is created under the specified folder path or at the root if no folder path is provided.`,
  instructions: [
    'Provide the username (nickname) of the account owner.',
    'Use folderPath to specify a subfolder (e.g., "Travel/Europe"). Leave empty for root folder.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      nickname: z.string().describe('SmugMug user nickname (account owner)'),
      folderPath: z
        .string()
        .optional()
        .describe(
          'Folder path where the album will be created (e.g., "Travel/Europe"). Leave empty for root folder.'
        ),
      name: z.string().describe('Album name/title'),
      urlName: z.string().optional().describe('Custom URL slug for the album'),
      description: z.string().optional().describe('Album description'),
      privacy: z
        .enum(['Public', 'Unlisted', 'Private'])
        .optional()
        .describe('Album privacy setting'),
      passwordHint: z
        .string()
        .optional()
        .describe('Password hint for password-protected albums'),
      sortMethod: z
        .string()
        .optional()
        .describe('Image sort method (e.g., "DateTimeOriginal", "Caption", "FileName")'),
      sortDirection: z.enum(['Ascending', 'Descending']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      albumKey: z.string().describe('Unique album key'),
      albumUri: z.string().describe('API URI of the album'),
      name: z.string().describe('Album name'),
      urlName: z.string().optional().describe('URL slug'),
      webUri: z.string().optional().describe('Web URL of the album'),
      privacy: z.string().optional().describe('Privacy setting'),
      nodeId: z.string().optional().describe('Associated node ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      tokenSecret: ctx.auth.tokenSecret,
      consumerKey: ctx.auth.consumerKey,
      consumerSecret: ctx.auth.consumerSecret
    });

    let albumData: Record<string, any> = {
      Name: ctx.input.name
    };
    if (ctx.input.urlName) albumData.UrlName = ctx.input.urlName;
    if (ctx.input.description) albumData.Description = ctx.input.description;
    if (ctx.input.privacy) albumData.Privacy = ctx.input.privacy;
    if (ctx.input.passwordHint) albumData.PasswordHint = ctx.input.passwordHint;
    if (ctx.input.sortMethod) albumData.SortMethod = ctx.input.sortMethod;
    if (ctx.input.sortDirection) albumData.SortDirection = ctx.input.sortDirection;

    let album = await client.createAlbum(
      ctx.input.folderPath || '',
      ctx.input.nickname,
      albumData
    );

    let nodeId: string | undefined;
    if (album?.Uris?.Node?.Uri) {
      let nodeParts = (album.Uris.Node.Uri as string).split('/');
      nodeId = nodeParts[nodeParts.length - 1];
    }

    return {
      output: {
        albumKey: album?.AlbumKey || '',
        albumUri: album?.Uri || '',
        name: album?.Name || ctx.input.name,
        urlName: album?.UrlName || undefined,
        webUri: album?.WebUri || undefined,
        privacy: album?.Privacy || undefined,
        nodeId
      },
      message: `Created album **${album?.Name || ctx.input.name}**`
    };
  })
  .build();

export let updateAlbumTool = SlateTool.create(spec, {
  name: 'Update Album',
  key: 'update_album',
  description: `Update an existing album's settings on SmugMug. Modify name, description, privacy, URL slug, sorting, searchability, watermark, and other album properties.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      albumKey: z.string().describe('Album key to update'),
      name: z.string().optional().describe('New album name'),
      urlName: z.string().optional().describe('New URL slug'),
      description: z.string().optional().describe('New description'),
      privacy: z
        .enum(['Public', 'Unlisted', 'Private'])
        .optional()
        .describe('Privacy setting'),
      passwordHint: z.string().optional().describe('Password hint'),
      sortMethod: z.string().optional().describe('Image sort method'),
      sortDirection: z.enum(['Ascending', 'Descending']).optional().describe('Sort direction'),
      smugSearchable: z
        .enum(['No', 'Inherit from User'])
        .optional()
        .describe('Searchable on SmugMug'),
      worldSearchable: z
        .enum(['No', 'Inherit from User'])
        .optional()
        .describe('Searchable on the web'),
      watermarkUri: z.string().optional().describe('Watermark URI to apply'),
      allowDownloads: z.boolean().optional().describe('Whether to allow downloads')
    })
  )
  .output(
    z.object({
      albumKey: z.string().describe('Album key'),
      name: z.string().describe('Album name'),
      webUri: z.string().optional().describe('Web URL'),
      privacy: z.string().optional().describe('Privacy setting'),
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

    let albumData: Record<string, any> = {};
    if (ctx.input.name) albumData.Name = ctx.input.name;
    if (ctx.input.urlName) albumData.UrlName = ctx.input.urlName;
    if (ctx.input.description !== undefined) albumData.Description = ctx.input.description;
    if (ctx.input.privacy) albumData.Privacy = ctx.input.privacy;
    if (ctx.input.passwordHint !== undefined) albumData.PasswordHint = ctx.input.passwordHint;
    if (ctx.input.sortMethod) albumData.SortMethod = ctx.input.sortMethod;
    if (ctx.input.sortDirection) albumData.SortDirection = ctx.input.sortDirection;
    if (ctx.input.smugSearchable) albumData.SmugSearchable = ctx.input.smugSearchable;
    if (ctx.input.worldSearchable) albumData.WorldSearchable = ctx.input.worldSearchable;
    if (ctx.input.watermarkUri) albumData.WatermarkUri = ctx.input.watermarkUri;
    if (ctx.input.allowDownloads !== undefined)
      albumData.AllowDownloads = ctx.input.allowDownloads;

    let album = await client.updateAlbum(ctx.input.albumKey, albumData);

    return {
      output: {
        albumKey: album?.AlbumKey || ctx.input.albumKey,
        name: album?.Name || '',
        webUri: album?.WebUri || undefined,
        privacy: album?.Privacy || undefined,
        lastUpdated: album?.LastUpdated || undefined
      },
      message: `Updated album **${album?.Name || ctx.input.albumKey}**`
    };
  })
  .build();

export let deleteAlbumTool = SlateTool.create(spec, {
  name: 'Delete Album',
  key: 'delete_album',
  description: `Permanently delete an album and all its contents from SmugMug. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      albumKey: z.string().describe('Album key to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the album was successfully deleted'),
      albumKey: z.string().describe('The deleted album key')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      tokenSecret: ctx.auth.tokenSecret,
      consumerKey: ctx.auth.consumerKey,
      consumerSecret: ctx.auth.consumerSecret
    });

    await client.deleteAlbum(ctx.input.albumKey);

    return {
      output: {
        deleted: true,
        albumKey: ctx.input.albumKey
      },
      message: `Deleted album **${ctx.input.albumKey}**`
    };
  })
  .build();

export let getAlbumTool = SlateTool.create(spec, {
  name: 'Get Album',
  key: 'get_album',
  description: `Retrieve detailed information about a SmugMug album including its settings, privacy, image count, and share URIs. Optionally include the list of images in the album.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      albumKey: z.string().describe('Album key to retrieve'),
      includeImages: z
        .boolean()
        .optional()
        .describe('Whether to include the list of images in the album'),
      imageStart: z
        .number()
        .optional()
        .describe('Starting index for image pagination (1-based)'),
      imageCount: z.number().optional().describe('Number of images to return (max 100)')
    })
  )
  .output(
    z.object({
      albumKey: z.string().describe('Album key'),
      name: z.string().describe('Album name'),
      description: z.string().optional().describe('Album description'),
      webUri: z.string().optional().describe('Web URL'),
      privacy: z.string().optional().describe('Privacy setting'),
      urlName: z.string().optional().describe('URL slug'),
      imageCount: z.number().optional().describe('Total number of images in the album'),
      lastUpdated: z.string().optional().describe('Last updated timestamp'),
      imagesLastUpdated: z.string().optional().describe('When images were last updated'),
      nodeId: z.string().optional().describe('Associated node ID'),
      images: z
        .array(
          z.object({
            imageKey: z.string().describe('Image key'),
            title: z.string().optional().describe('Image title'),
            caption: z.string().optional().describe('Image caption'),
            fileName: z.string().optional().describe('Original filename'),
            webUri: z.string().optional().describe('Web URL'),
            thumbnailUrl: z.string().optional().describe('Thumbnail URL'),
            dateUploaded: z.string().optional().describe('Upload date')
          })
        )
        .optional()
        .describe('Images in the album'),
      totalImages: z.number().optional().describe('Total images count from pagination')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      tokenSecret: ctx.auth.tokenSecret,
      consumerKey: ctx.auth.consumerKey,
      consumerSecret: ctx.auth.consumerSecret
    });

    let album = await client.getAlbum(ctx.input.albumKey);

    let nodeId: string | undefined;
    if (album?.Uris?.Node?.Uri) {
      let nodeParts = (album.Uris.Node.Uri as string).split('/');
      nodeId = nodeParts[nodeParts.length - 1];
    }

    let images: any[] | undefined;
    let totalImages: number | undefined;

    if (ctx.input.includeImages) {
      let result = await client.getAlbumImages(ctx.input.albumKey, {
        start: ctx.input.imageStart,
        count: ctx.input.imageCount
      });
      images = result.items.map((img: any) => ({
        imageKey: img.ImageKey || '',
        title: img.Title || undefined,
        caption: img.Caption || undefined,
        fileName: img.FileName || undefined,
        webUri: img.WebUri || undefined,
        thumbnailUrl: img.ThumbnailUrl || undefined,
        dateUploaded: img.Date || undefined
      }));
      totalImages = result.pages.total;
    }

    return {
      output: {
        albumKey: album?.AlbumKey || ctx.input.albumKey,
        name: album?.Name || '',
        description: album?.Description || undefined,
        webUri: album?.WebUri || undefined,
        privacy: album?.Privacy || undefined,
        urlName: album?.UrlName || undefined,
        imageCount: album?.ImageCount || undefined,
        lastUpdated: album?.LastUpdated || undefined,
        imagesLastUpdated: album?.ImagesLastUpdated || undefined,
        nodeId,
        images,
        totalImages
      },
      message: `Retrieved album **${album?.Name || ctx.input.albumKey}**${images ? ` with ${images.length} images` : ''}`
    };
  })
  .build();

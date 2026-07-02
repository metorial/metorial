import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAsset = SlateTool.create(spec, {
  name: 'Get Asset',
  key: 'get_asset',
  description: `Retrieve metadata for an asset (image or video) in the user's Canva library, including name, tags, timestamps, and thumbnail info.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      assetId: z.string().describe('The ID of the asset to retrieve')
    })
  )
  .output(
    z.object({
      assetId: z.string().describe('The asset ID'),
      type: z.string().describe('Asset type: "image" or "video"'),
      name: z.string().describe('Asset name'),
      tags: z.array(z.string()).describe('User-defined tags'),
      createdAt: z.number().describe('Unix timestamp of creation'),
      updatedAt: z.number().describe('Unix timestamp of last modification'),
      ownerUserId: z.string().describe('Owner user ID'),
      ownerTeamId: z.string().describe('Owner team ID'),
      thumbnailUrl: z.string().optional().describe('Thumbnail URL (expires after 15 minutes)'),
      thumbnailWidth: z.number().optional().describe('Thumbnail width in pixels'),
      thumbnailHeight: z.number().optional().describe('Thumbnail height in pixels')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let asset = await client.getAsset(ctx.input.assetId);

    return {
      output: asset,
      message: `Retrieved asset **${asset.name}** (${asset.type}, ID: ${asset.assetId}).`
    };
  })
  .build();

export let updateAsset = SlateTool.create(spec, {
  name: 'Update Asset',
  key: 'update_asset',
  description: `Update an asset's name and/or tags. Updating tags replaces all existing tags on the asset.`,
  instructions: [
    'Provide at least one of name or tags to update.',
    'Setting tags will replace all existing tags, not append to them.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      assetId: z.string().describe('The ID of the asset to update'),
      name: z.string().max(50).optional().describe('New asset name (max 50 characters)'),
      tags: z
        .array(z.string())
        .max(50)
        .optional()
        .describe('New tags for the asset (replaces all existing tags, max 50)')
    })
  )
  .output(
    z.object({
      assetId: z.string().describe('The asset ID'),
      type: z.string().describe('Asset type'),
      name: z.string().describe('Updated asset name'),
      tags: z.array(z.string()).describe('Updated tags'),
      createdAt: z.number().describe('Unix timestamp of creation'),
      updatedAt: z.number().describe('Unix timestamp of last modification'),
      ownerUserId: z.string().describe('Owner user ID'),
      ownerTeamId: z.string().describe('Owner team ID'),
      thumbnailUrl: z.string().optional().describe('Thumbnail URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let asset = await client.updateAsset(ctx.input.assetId, {
      name: ctx.input.name,
      tags: ctx.input.tags
    });

    return {
      output: asset,
      message: `Updated asset **${asset.name}** (ID: ${asset.assetId}).`
    };
  })
  .build();

export let deleteAsset = SlateTool.create(spec, {
  name: 'Delete Asset',
  key: 'delete_asset',
  description: `Delete an asset from the user's Canva library. The asset is moved to trash. Deleting an asset does not remove it from designs that already use it.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      assetId: z.string().describe('The ID of the asset to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteAsset(ctx.input.assetId);

    return {
      output: { deleted: true },
      message: `Deleted asset ${ctx.input.assetId}. The asset has been moved to trash.`
    };
  })
  .build();

export let uploadAsset = SlateTool.create(spec, {
  name: 'Upload Asset',
  key: 'upload_asset',
  description: `Upload an asset (image or video) to the user's Canva library from a URL. This starts an asynchronous upload job. Use the returned job ID to check the upload status.`,
  constraints: [
    'Images: max 50 MB (JPEG, PNG, HEIC, GIF, TIFF, WebP)',
    'Videos: max 500 MB (M4V, MKV, MP4, MPEG, QuickTime, WebM)'
  ]
})
  .input(
    z.object({
      name: z.string().max(50).describe('Name for the asset (max 50 characters)'),
      url: z.string().describe('URL of the file to upload')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('The upload job ID for checking status'),
      status: z.string().describe('Job status: "in_progress", "success", or "failed"'),
      errorCode: z.string().optional().describe('Error code if the upload failed'),
      errorMessage: z.string().optional().describe('Error message if the upload failed'),
      asset: z
        .object({
          assetId: z.string(),
          type: z.string(),
          name: z.string(),
          tags: z.array(z.string()),
          createdAt: z.number(),
          updatedAt: z.number(),
          ownerUserId: z.string(),
          ownerTeamId: z.string(),
          thumbnailUrl: z.string().optional()
        })
        .optional()
        .describe('The uploaded asset details (present when status is "success")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let job = await client.uploadAssetFromUrl({
      name: ctx.input.name,
      url: ctx.input.url
    });

    let statusMsg =
      job.status === 'success'
        ? `Asset **${job.asset?.name}** uploaded successfully.`
        : job.status === 'failed'
          ? `Upload failed: ${job.errorMessage || job.errorCode}`
          : `Upload job started (ID: ${job.jobId}). Status: ${job.status}.`;

    return {
      output: job,
      message: statusMsg
    };
  })
  .build();

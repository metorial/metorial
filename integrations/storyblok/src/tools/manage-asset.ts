import { SlateTool } from 'slates';
import { z } from 'zod';
import { StoryblokClient } from '../lib/client';
import { spec } from '../spec';

let assetOutputSchema = z.object({
  assetId: z.number().optional().describe('Numeric ID of the asset'),
  filename: z.string().optional().describe('Full URL of the asset file'),
  name: z.string().optional().describe('Display name of the asset'),
  contentType: z.string().optional().describe('MIME content type'),
  contentLength: z.number().optional().describe('File size in bytes'),
  alt: z.string().optional().describe('Alt text for the asset'),
  title: z.string().optional().describe('Title of the asset'),
  copyright: z.string().optional().describe('Copyright information'),
  focus: z.string().optional().describe('Focal point coordinates'),
  isPrivate: z.boolean().optional().describe('Whether the asset is private'),
  assetFolderId: z.number().optional().describe('Folder ID'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let manageAsset = SlateTool.create(spec, {
  name: 'Manage Asset',
  key: 'manage_asset',
  description: `Update metadata or delete media assets. Use this to change alt text, title, copyright, focal point, folder assignment, or privacy settings of existing assets, or to delete them.`,
  instructions: [
    'To **update** an asset, set action to "update" and provide the assetId plus fields to change.',
    'To **delete** an asset, set action to "delete" and provide the assetId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['update', 'delete']).describe('The asset management action to perform'),
      assetId: z.string().describe('Asset ID'),
      name: z.string().optional().describe('Display name for the asset'),
      alt: z.string().optional().describe('Alt text for accessibility'),
      title: z.string().optional().describe('Title of the asset'),
      copyright: z.string().optional().describe('Copyright information'),
      focus: z.string().optional().describe('Focal point coordinates (e.g. "200x300")'),
      assetFolderId: z.number().optional().describe('Move asset to this folder ID'),
      isPrivate: z.boolean().optional().describe('Whether the asset should be private')
    })
  )
  .output(assetOutputSchema)
  .handleInvocation(async ctx => {
    let client = new StoryblokClient({
      token: ctx.auth.token,
      region: ctx.auth.region,
      spaceId: ctx.config.spaceId
    });

    let { action, assetId } = ctx.input;

    if (action === 'delete') {
      await client.deleteAsset(assetId);
      return {
        output: { assetId: Number.parseInt(assetId, 10) },
        message: `Deleted asset \`${assetId}\`.`
      };
    }

    // action === 'update'
    let asset = await client.updateAsset(assetId, {
      name: ctx.input.name,
      alt: ctx.input.alt,
      title: ctx.input.title,
      copyright: ctx.input.copyright,
      focus: ctx.input.focus,
      assetFolderId: ctx.input.assetFolderId,
      isPrivate: ctx.input.isPrivate
    });

    return {
      output: {
        assetId: asset.id,
        filename: asset.filename,
        name: asset.name,
        contentType: asset.content_type,
        contentLength: asset.content_length,
        alt: asset.alt,
        title: asset.title,
        copyright: asset.copyright,
        focus: asset.focus,
        isPrivate: asset.is_private,
        assetFolderId: asset.asset_folder_id,
        createdAt: asset.created_at
      },
      message: `Updated asset **${asset.name || asset.filename}** (\`${asset.id}\`).`
    };
  })
  .build();

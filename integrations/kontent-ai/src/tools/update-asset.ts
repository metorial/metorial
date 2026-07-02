import { SlateTool } from 'slates';
import { z } from 'zod';
import { ManagementClient } from '../lib/client';
import { spec } from '../spec';

export let updateAsset = SlateTool.create(spec, {
  name: 'Update Asset',
  key: 'update_asset',
  description: `Updates an existing asset's metadata including title, descriptions, and folder assignment. Only provided fields are modified.`
})
  .input(
    z.object({
      assetId: z.string().describe('Internal ID of the asset to update'),
      title: z.string().optional().describe('New title for the asset'),
      descriptions: z
        .array(
          z.object({
            languageCodename: z.string().describe('Language codename for this description'),
            description: z.string().describe('Description text')
          })
        )
        .optional()
        .describe('Updated descriptions by language'),
      folderId: z.string().optional().describe('ID of the folder to move the asset to')
    })
  )
  .output(
    z.object({
      assetId: z.string().describe('ID of the updated asset'),
      fileName: z.string().describe('File name'),
      title: z.string().nullable().describe('Updated title'),
      url: z.string().describe('Asset URL'),
      lastModified: z.string().describe('ISO 8601 timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ManagementClient({
      token: ctx.auth.token,
      environmentId: ctx.config.environmentId
    });

    let descriptions = ctx.input.descriptions?.map(d => ({
      language: { codename: d.languageCodename },
      description: d.description
    }));

    let asset = await client.updateAsset(ctx.input.assetId, {
      title: ctx.input.title,
      descriptions,
      folder: ctx.input.folderId ? { id: ctx.input.folderId } : undefined
    });

    return {
      output: {
        assetId: asset.id,
        fileName: asset.file_name,
        title: asset.title,
        url: asset.url,
        lastModified: asset.last_modified
      },
      message: `Updated asset **"${asset.title || asset.file_name}"**.`
    };
  })
  .build();

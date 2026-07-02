import { SlateTool } from 'slates';
import { z } from 'zod';
import { CincopaClient } from '../lib/client';
import { spec } from '../spec';

export let createGallery = SlateTool.create(spec, {
  name: 'Create Gallery',
  key: 'create_gallery',
  description: `Create a new multimedia gallery in Cincopa. You can set a name, description, apply a template, clone settings or items from an existing gallery, or link a master gallery. Returns the new gallery ID and a temporary upload URL.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Gallery name (max 255 characters)'),
      description: z.string().optional().describe('Gallery description'),
      template: z.string().optional().describe('Template ID to apply for visual style'),
      copyArgsFrom: z
        .string()
        .optional()
        .describe('Gallery ID to copy all settings from (overrides template)'),
      masterGalleryId: z
        .string()
        .optional()
        .describe('Master gallery ID to synchronize settings with'),
      copyItemsFrom: z.string().optional().describe('Gallery ID to clone media items from')
    })
  )
  .output(
    z.object({
      galleryId: z.string().describe('Unique ID (fid) of the newly created gallery'),
      uploadUrl: z
        .string()
        .optional()
        .describe('Temporary URL for uploading media to this gallery (expires after 24h)'),
      success: z.boolean().describe('Whether the gallery was created successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CincopaClient({ token: ctx.auth.token });
    let data = await client.createGallery({
      name: ctx.input.name,
      description: ctx.input.description,
      template: ctx.input.template,
      copyArgs: ctx.input.copyArgsFrom,
      master: ctx.input.masterGalleryId,
      copyItems: ctx.input.copyItemsFrom
    });

    return {
      output: {
        galleryId: data.fid || '',
        uploadUrl: data.upload_url,
        success: data.success === true
      },
      message: `Gallery **${ctx.input.name || data.fid}** created successfully with ID \`${data.fid}\`.`
    };
  })
  .build();

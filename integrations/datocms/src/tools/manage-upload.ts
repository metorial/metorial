import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageUpload = SlateTool.create(spec, {
  name: 'Manage Upload',
  key: 'manage_upload',
  description: `Get, update, or delete a media asset (upload). Use this to inspect upload details, update metadata (tags, copyright, alt text), or remove an asset.`
})
  .input(
    z.object({
      action: z.enum(['get', 'update', 'delete']).describe('Action to perform on the upload'),
      uploadId: z.string().describe('ID of the upload'),
      copyright: z.string().optional().describe('Copyright information (for update)'),
      author: z.string().optional().describe('Author name (for update)'),
      notes: z.string().optional().describe('Internal notes (for update)'),
      tags: z.array(z.string()).optional().describe('Array of tags (for update)'),
      defaultFieldMetadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Per-locale metadata with title, alt, focal_point, custom_data (for update)')
    })
  )
  .output(
    z.object({
      upload: z.any().describe('The upload object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let { action, uploadId, ...updateFields } = ctx.input;

    if (action === 'get') {
      let upload = await client.getUpload(uploadId);
      return {
        output: { upload },
        message: `Retrieved upload **${upload.filename || upload.id}**.`
      };
    }

    if (action === 'update') {
      let attributes: Record<string, any> = {};
      if (updateFields.copyright !== undefined) attributes.copyright = updateFields.copyright;
      if (updateFields.author !== undefined) attributes.author = updateFields.author;
      if (updateFields.notes !== undefined) attributes.notes = updateFields.notes;
      if (updateFields.tags) attributes.tags = updateFields.tags;
      if (updateFields.defaultFieldMetadata)
        attributes.default_field_metadata = updateFields.defaultFieldMetadata;

      let upload = await client.updateUpload(uploadId, attributes);
      return {
        output: { upload },
        message: `Updated upload **${upload.filename || upload.id}**.`
      };
    }

    if (action === 'delete') {
      let upload = await client.deleteUpload(uploadId);
      return {
        output: { upload },
        message: `Deleted upload with ID **${uploadId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();

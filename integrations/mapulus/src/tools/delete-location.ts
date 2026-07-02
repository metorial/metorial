import { SlateTool } from 'slates';
import { z } from 'zod';
import { MapulusClient } from '../lib/client';
import { spec } from '../spec';

export let deleteLocation = SlateTool.create(spec, {
  name: 'Delete Location',
  key: 'delete_location',
  description: `Permanently delete a location from Mapulus. This removes the location and all associated data including travel boundaries and custom attributes.`,
  constraints: [
    'This action is irreversible. The location cannot be recovered after deletion.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      locationId: z.string().describe('ID of the location to delete')
    })
  )
  .output(
    z.object({
      locationId: z.string().describe('ID of the deleted location'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MapulusClient(ctx.auth.token);
    await client.deleteLocation(ctx.input.locationId);

    return {
      output: {
        locationId: ctx.input.locationId,
        deleted: true
      },
      message: `Deleted location **${ctx.input.locationId}**.`
    };
  })
  .build();

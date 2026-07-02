import { SlateTool } from 'slates';
import { GraphClient } from '../lib/client';
import { driveItemLocationSchema, driveItemOutputSchema, mapDriveItem } from '../lib/schemas';
import { spec } from '../spec';

export let getPresentation = SlateTool.create(spec, {
  name: 'Get Presentation',
  key: 'get_presentation',
  description: `Retrieve metadata and properties of a PowerPoint presentation stored in OneDrive or SharePoint. Returns file name, size, timestamps, parent folder info, and web URL. Locate a file by its unique ID or by its path.`,
  tags: {
    readOnly: true
  }
})
  .input(driveItemLocationSchema)
  .output(driveItemOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GraphClient(ctx.auth.token);

    let item = await client.getItem({
      itemId: ctx.input.itemId,
      itemPath: ctx.input.itemPath,
      driveId: ctx.input.driveId,
      siteId: ctx.input.siteId
    });

    let output = mapDriveItem(item);

    return {
      output,
      message: `Retrieved presentation **${output.name}** (${output.size ? `${(output.size / 1024).toFixed(1)} KB` : 'unknown size'})`
    };
  })
  .build();

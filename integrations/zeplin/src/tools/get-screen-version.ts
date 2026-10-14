import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZeplinClient } from '../lib/client';
import { spec } from '../spec';

export let getScreenVersion = SlateTool.create(spec, {
  name: 'Get Screen Version',
  key: 'get_screen_version',
  description:
    'Retrieve design details for a published screen version, including layers, assets, image metadata, and commit information. Omit versionId to retrieve the latest version.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      projectId: z.string().min(1).describe('Project ID from list_projects'),
      screenId: z.string().min(1).describe('Screen ID from list_screens'),
      versionId: z
        .string()
        .min(1)
        .optional()
        .describe('Version ID from list_screen_versions; omit for the latest version')
    })
  )
  .output(
    z.object({
      versionId: z.string().describe('Retrieved screen version identifier'),
      version: z.any().describe('Zeplin screen-version design data and metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZeplinClient(ctx.auth.token);
    let version = await client.getScreenVersion(
      ctx.input.projectId,
      ctx.input.screenId,
      ctx.input.versionId
    );
    return {
      output: { versionId: version.id, version },
      message: `Retrieved screen version **${version.id}**.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

export const downloadEntityFile = SlateTool.create(spec, {
  key: 'download_entity_file',
  name: 'Download Entity File',
  description:
    'Download an accessible file attached to an Affinity person, organization or opportunity. Call get_entity_files to discover file IDs.',
  tags: { readOnly: true }
})
  .input(z.object({ entityFileId: z.number().describe('File ID from get_entity_files.') }))
  .output(
    z.object({
      entityFileId: z.number(),
      name: z.string().nullable(),
      size: z.number().nullable(),
      personId: z.number().nullable(),
      organizationId: z.number().nullable(),
      opportunityId: z.number().nullable()
    })
  )
  .handleInvocation(async ctx => {
    const client = new AffinityClient(ctx.auth.token);
    const file = await client.getEntityFile(ctx.input.entityFileId);
    await ctx.addAttachment({
      type: 'url',
      url: client.downloadEntityFileUrl(file.id),
      mimeType: 'application/octet-stream',
      headers: { Authorization: `Bearer ${ctx.auth.token}` }
    });
    return {
      output: {
        entityFileId: file.id,
        name: file.name ?? null,
        size: file.size ?? null,
        personId: file.person_id ?? null,
        organizationId: file.organization_id ?? null,
        opportunityId: file.opportunity_id ?? null
      },
      message: `Prepared file ${file.id} for download.`
    };
  })
  .build();

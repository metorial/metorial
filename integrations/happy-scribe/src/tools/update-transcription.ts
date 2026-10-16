import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { organizationId, rawSchema, transcriptionMetadata } from '../lib/responses';
import { spec } from '../spec';

export let updateTranscription = SlateTool.create(spec, {
  key: 'update_transcription',
  name: 'Update Transcription',
  description:
    'Rename a transcription, move it to another folder in the same organization, or enable or revoke public link sharing. Call list_organizations to discover organization IDs.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      transcriptionId: z.string(),
      organizationId: z
        .string()
        .optional()
        .describe(
          'Call list_organizations to discover IDs. Defaults to the saved organization setting.'
        ),
      name: z.string().optional(),
      folderId: z
        .string()
        .optional()
        .describe(
          'Destination folder ID in the same organization. Current folder IDs appear in get_transcription metadata.'
        ),
      sharingEnabled: z
        .boolean()
        .optional()
        .describe('Enable Anyone with the link access, or revoke it with false.')
    })
  )
  .output(
    z.object({
      transcriptionId: z.string(),
      name: z.string(),
      state: z.string(),
      sharingEnabled: z.boolean().optional(),
      publicUrl: z
        .string()
        .nullable()
        .optional()
        .describe('Provider public sharing URL, or null while sharing is disabled.'),
      raw: rawSchema
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.name === undefined &&
      ctx.input.folderId === undefined &&
      ctx.input.sharingEnabled === undefined
    ) {
      throw createApiServiceError(
        'Provide name, folderId or sharingEnabled to update the transcription.'
      );
    }
    let result = await new Client(ctx.auth).updateTranscription(ctx.input.transcriptionId, {
      organization_id: organizationId(ctx.input.organizationId, ctx.config.organizationId),
      name: ctx.input.name,
      folder_id: ctx.input.folderId,
      sharing_enabled: ctx.input.sharingEnabled
    });
    return {
      output: {
        transcriptionId: result.id,
        name: result.name,
        state: result.state,
        sharingEnabled: result.sharingEnabled ?? undefined,
        publicUrl: result.publicUrl,
        raw: transcriptionMetadata(result)
      },
      message: `Updated transcription **${result.id}**.`
    };
  })
  .build();

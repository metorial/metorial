import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listVoices = SlateTool.create(spec, {
  name: 'List Voices',
  key: 'list_voices',
  description: `Browse available voices for AI agents. Returns voice IDs, names, and preview URLs. Use the voice ID when creating or updating an agent.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspace: z.string().describe('Workspace ID from the Synthflow dashboard'),
      limit: z.number().optional().describe('Number of voices per page (default: 50)'),
      offset: z.number().optional().describe('Starting index for pagination')
    })
  )
  .output(
    z.object({
      voices: z
        .array(
          z.object({
            voiceId: z.string().optional(),
            name: z.string().optional(),
            preview: z.string().optional()
          })
        )
        .describe('List of available voices'),
      pagination: z
        .object({
          totalRecords: z.number().optional(),
          limit: z.number().optional(),
          offset: z.number().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listVoices({
      workspace: ctx.input.workspace,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });
    let response = result.response || {};
    let voices = (response.voices || []).map((v: any) => ({
      voiceId: v.voice_id,
      name: v.name,
      preview: v.preview
    }));
    let pagination = response.pagination;

    return {
      output: {
        voices,
        pagination: pagination
          ? {
              totalRecords: pagination.total_records,
              limit: pagination.limit,
              offset: pagination.offset
            }
          : undefined
      },
      message: `Found ${voices.length} voice(s).`
    };
  })
  .build();

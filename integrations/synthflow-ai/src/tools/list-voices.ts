import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { workspaceSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listVoices = SlateTool.create(spec, {
  name: 'List Voices',
  key: 'list_voices',
  description: `Browse available voices for AI agents. Returns voice IDs, names, and preview URLs. Use the voice ID when creating or updating an agent. Discover workspace_id with manage_contact (get/list) or run_simulation (list).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspace: workspaceSchema,
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Number of voices per page (default: 50)'),
      offset: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Starting index for pagination'),
      search: z.string().optional().describe('Search voices by name'),
      provider: z
        .enum(['elevenlabs', 'deepgram', 'synthflow'])
        .optional()
        .describe('Voice provider; defaults to elevenlabs')
    })
  )
  .output(
    z.object({
      voices: z
        .array(
          z.object({
            voiceId: z.string().optional(),
            name: z.string().optional(),
            preview: z.string().optional(),
            workspace: z.string().optional(),
            provider: z.string().optional(),
            gender: z.string().nullable().optional(),
            languages: z.array(z.string()).nullable().optional()
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
    let client = new Client(ctx.auth);
    let result = await client.listVoices({
      workspace: ctx.input.workspace,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      search: ctx.input.search,
      provider: ctx.input.provider
    });
    let response = result.response || {};
    let voices = (response.voices || []).map((v: any) => ({
      voiceId: v.voice_id,
      name: v.name,
      preview: v.preview,
      workspace: v.workspace,
      provider: v.provider,
      gender: v.gender,
      languages: v.languages
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

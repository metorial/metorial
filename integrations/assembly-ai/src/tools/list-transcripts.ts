import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTranscripts = SlateTool.create(spec, {
  name: 'List Transcripts',
  key: 'list_transcripts',
  description: `List transcripts with pagination and optional filters. Returns transcript summaries sorted from newest to oldest.
Supports filtering by status and creation date, and cursor-based pagination using before/after IDs.`,
  constraints: ['Only transcripts from the last 90 days are available.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of transcripts to return per page.'),
      status: z
        .enum(['queued', 'processing', 'completed', 'error'])
        .optional()
        .describe('Filter by transcript status.'),
      createdOn: z
        .string()
        .optional()
        .describe('Filter by creation date (YYYY-MM-DD format).'),
      beforeId: z
        .string()
        .optional()
        .describe('Return transcripts created before this transcript ID (for pagination).'),
      afterId: z
        .string()
        .optional()
        .describe('Return transcripts created after this transcript ID (for pagination).'),
      throttledOnly: z.boolean().optional().describe('Only return throttled transcripts.')
    })
  )
  .output(
    z.object({
      transcripts: z.array(
        z.object({
          transcriptId: z.string().describe('Unique transcript identifier.'),
          status: z.string().describe('Transcript status.'),
          audioUrl: z.string().describe('Source audio URL.'),
          created: z.string().describe('Creation timestamp.'),
          completed: z.string().optional().nullable().describe('Completion timestamp.'),
          error: z.string().optional().nullable().describe('Error message if failed.'),
          resourceUrl: z.string().describe('URL to retrieve the full transcript.')
        })
      ),
      pageDetails: z.object({
        limit: z.number().describe('Results per page.'),
        resultCount: z.number().describe('Number of results in current page.'),
        currentUrl: z.string().describe('URL for the current page.'),
        prevUrl: z
          .string()
          .optional()
          .nullable()
          .describe('URL for the previous page (older transcripts).'),
        nextUrl: z
          .string()
          .optional()
          .nullable()
          .describe('URL for the next page (newer transcripts).')
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.listTranscripts(ctx.input);

    let transcripts = (result.transcripts || []).map((t: any) => ({
      transcriptId: t.id,
      status: t.status,
      audioUrl: t.audio_url,
      created: t.created,
      completed: t.completed ?? null,
      error: t.error ?? null,
      resourceUrl: t.resource_url
    }));

    return {
      output: {
        transcripts,
        pageDetails: {
          limit: result.page_details?.limit ?? result.limit,
          resultCount:
            result.page_details?.result_count ?? result.result_count ?? transcripts.length,
          currentUrl: result.page_details?.current_url ?? result.current_url ?? '',
          prevUrl: result.page_details?.prev_url ?? result.prev_url ?? null,
          nextUrl: result.page_details?.next_url ?? result.next_url ?? null
        }
      },
      message: `Found **${transcripts.length}** transcript(s).`
    };
  })
  .build();

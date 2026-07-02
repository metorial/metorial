import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirefliesClient } from '../lib/client';
import { spec } from '../spec';
import { mapSummary, summarySchema } from './shared';

export let getSummary = SlateTool.create(spec, {
  name: 'Get Summary',
  key: 'get_summary',
  description: `Fetch a meeting summary by transcript ID, including action items, keywords, overview, notes, topics discussed, meeting type, chapters, and custom extended sections. Excludes transcript sentence content.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      transcriptId: z.string().describe('The transcript ID to summarize')
    })
  )
  .output(
    z.object({
      transcriptId: z.string(),
      title: z.string().nullable(),
      summary: summarySchema.nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirefliesClient({ token: ctx.auth.token });
    let transcript = await client.getSummary(ctx.input.transcriptId);
    let output = {
      transcriptId: String(transcript?.id ?? ctx.input.transcriptId),
      title: transcript?.title ?? null,
      summary: mapSummary(transcript?.summary)
    };

    return {
      output,
      message: `Retrieved summary for transcript **${output.title ?? output.transcriptId}**.`
    };
  })
  .build();

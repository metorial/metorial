import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirefliesClient } from '../lib/client';
import { firefliesServiceError } from '../lib/errors';
import { spec } from '../spec';
import { assertLimit, assertNonNegativeSkip, biteSchema, mapBite } from './shared';

export let listSoundbites = SlateTool.create(spec, {
  name: 'List Soundbites',
  key: 'list_soundbites',
  description: `List Fireflies soundbites. Provide at least one scope: mine, transcriptId, or myTeam. Supports pagination up to 50 soundbites per request.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mine: z.boolean().optional().describe('Fetch soundbites for the API key owner'),
      transcriptId: z.string().optional().describe('Fetch soundbites for a transcript'),
      myTeam: z.boolean().optional().describe('Fetch soundbites for the owner/team'),
      limit: z.number().optional().describe('Maximum number of soundbites to return (max 50)'),
      skip: z.number().optional().describe('Number of records to skip for pagination')
    })
  )
  .output(
    z.object({
      soundbites: z.array(biteSchema).describe('Matching soundbites')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.mine && !ctx.input.transcriptId && !ctx.input.myTeam) {
      throw firefliesServiceError('Provide at least one of mine, transcriptId, or myTeam.');
    }
    assertLimit(ctx.input.limit, 'limit', 50);
    assertNonNegativeSkip(ctx.input.skip);

    let client = new FirefliesClient({ token: ctx.auth.token });
    let bites = await client.getBites({
      mine: ctx.input.mine,
      transcriptId: ctx.input.transcriptId,
      myTeam: ctx.input.myTeam,
      limit: ctx.input.limit,
      skip: ctx.input.skip
    });
    let mapped = (bites || []).map((bite: any) => mapBite(bite));

    return {
      output: { soundbites: mapped },
      message: `Found **${mapped.length}** soundbite(s).`
    };
  })
  .build();

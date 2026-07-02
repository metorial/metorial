import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocsBotAdminClient } from '../lib/client';
import { spec } from '../spec';

export let listBots = SlateTool.create(spec, {
  name: 'List Bots',
  key: 'list_bots',
  description: `List all bots for the configured team. Returns each bot's name, description, model, status, and usage statistics.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      bots: z.array(
        z.object({
          botId: z.string().describe('Unique bot identifier'),
          name: z.string().describe('Bot name'),
          description: z.string().describe('Bot description'),
          model: z.string().describe('AI model used'),
          privacy: z.string().describe('"public" or "private"'),
          language: z.string().describe('Language code'),
          status: z.string().describe('Bot status (pending, indexing, processing, ready)'),
          createdAt: z.string().describe('ISO 8601 creation timestamp'),
          questionCount: z.number().describe('Total questions asked'),
          sourceCount: z.number().describe('Number of sources'),
          pageCount: z.number().describe('Pages crawled'),
          chunkCount: z.number().describe('Document chunks indexed')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocsBotAdminClient(ctx.auth.token);
    let bots = await client.listBots(ctx.config.teamId);

    let mapped = bots.map(b => ({
      botId: b.id,
      name: b.name,
      description: b.description,
      model: b.model,
      privacy: b.privacy,
      language: b.language,
      status: b.status,
      createdAt: b.createdAt,
      questionCount: b.questionCount,
      sourceCount: b.sourceCount,
      pageCount: b.pageCount,
      chunkCount: b.chunkCount
    }));

    return {
      output: { bots: mapped },
      message: `Found **${mapped.length}** bot(s): ${mapped.map(b => `**${b.name}** (${b.status}, ${b.model})`).join(', ')}`
    };
  })
  .build();

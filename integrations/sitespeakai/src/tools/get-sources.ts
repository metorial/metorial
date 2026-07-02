import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let sourceSchema = z.object({
  sourceId: z.string().describe('Source identifier.'),
  chatbotId: z.string().describe('Associated chatbot ID.'),
  type: z.string().nullable().describe('Source type (e.g. "website").'),
  url: z.string().nullable().describe('Source URL.'),
  title: z.string().nullable().describe('Source title.'),
  status: z.string().nullable().describe('Training status (e.g. "trained").'),
  syncFrequency: z.string().nullable().describe('How often the source is re-synced.'),
  trainedAt: z.string().nullable().describe('Last training timestamp.'),
  createdAt: z.string().nullable().describe('Source creation timestamp.'),
  updatedAt: z.string().nullable().describe('Source last update timestamp.')
});

export let getSources = SlateTool.create(spec, {
  name: 'Get Training Sources',
  key: 'get_sources',
  description: `Retrieve the list of content sources used to train a chatbot. Includes each source's type, URL, training status, sync frequency, and timestamps. Useful for auditing what content the chatbot has been trained on.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      chatbotId: z.string().describe('The ID of the chatbot.')
    })
  )
  .output(
    z.object({
      sources: z.array(sourceSchema).describe('List of training sources.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getSources(ctx.input.chatbotId);

    let sources = Array.isArray(data) ? data : [];

    let mapped = sources.map((s: any) => ({
      sourceId: s.id?.toString() ?? '',
      chatbotId: s.chatbot_id?.toString() ?? '',
      type: s.type ?? null,
      url: s.url ?? null,
      title: s.title ?? null,
      status: s.status ?? null,
      syncFrequency: s.sync_frequency ?? null,
      trainedAt: s.trained_at ?? null,
      createdAt: s.created_at ?? null,
      updatedAt: s.updated_at ?? null
    }));

    return {
      output: {
        sources: mapped
      },
      message: `Retrieved ${mapped.length} training source(s).`
    };
  })
  .build();

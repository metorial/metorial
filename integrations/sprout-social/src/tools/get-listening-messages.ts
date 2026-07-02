import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getListeningMessages = SlateTool.create(spec, {
  name: 'Get Listening Messages',
  key: 'get_listening_messages',
  description: `Retrieve earned media messages from a Sprout Social Listening Topic. Returns individual messages with their content, author, and metrics. Messages can be filtered by time range, network, sentiment, language, location, and more.`,
  instructions: [
    'Get topic IDs from the Get Metadata tool (resourceType: "topics").',
    'A created_time filter is required. Format: "created_time.in(YYYY-MM-DD..YYYY-MM-DDTHH:MM:SS)".',
    'Network filter format: "network.eq(INSTAGRAM, FACEBOOK, REDDIT, YOUTUBE, TUMBLR, WEB)".',
    'Sentiment filter format: "sentiment.eq(POSITIVE, NEGATIVE, NEUTRAL)".',
    'Available fields include: "content_category", "created_time", "hashtags", "text", "from.name".',
    'Available metrics include: "likes", "replies", "shares_count".'
  ],
  constraints: [
    'Listening data from X (Twitter) is currently unavailable.',
    'Maximum 100 results per page.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      topicId: z.string().describe('Listening topic ID.'),
      startTime: z.string().describe('Start time in ISO 8601 or YYYY-MM-DD format.'),
      endTime: z.string().describe('End time in ISO 8601 or YYYY-MM-DD format.'),
      networks: z
        .array(z.string())
        .optional()
        .describe(
          'Networks to filter by (e.g., "INSTAGRAM", "FACEBOOK", "REDDIT", "YOUTUBE", "WEB").'
        ),
      sentiment: z
        .array(z.string())
        .optional()
        .describe('Sentiment to filter by (e.g., "POSITIVE", "NEGATIVE", "NEUTRAL").'),
      fields: z
        .array(z.string())
        .optional()
        .describe('Fields to return (e.g., "created_time", "text", "from.name", "hashtags").'),
      metrics: z
        .array(z.string())
        .optional()
        .describe('Metrics to return per message (e.g., "likes", "replies", "shares_count").'),
      sort: z.array(z.string()).optional().describe('Sort order (e.g., "created_time:desc").'),
      timezone: z.string().optional().describe('IANA timezone (e.g., "America/Chicago").'),
      page: z.number().optional().describe('Page number for pagination (1-indexed).'),
      limit: z.number().optional().describe('Results per page (max 100).')
    })
  )
  .output(
    z.object({
      messages: z.array(z.any()).describe('Array of listening message objects.'),
      paging: z
        .object({
          currentPage: z.number().optional(),
          totalPages: z.number().optional()
        })
        .optional()
        .describe('Pagination information.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      customerId: ctx.config.customerId
    });

    let filters: string[] = [`created_time.in(${ctx.input.startTime}..${ctx.input.endTime})`];
    if (ctx.input.networks?.length) {
      filters.push(`network.eq(${ctx.input.networks.join(',')})`);
    }
    if (ctx.input.sentiment?.length) {
      filters.push(`sentiment.eq(${ctx.input.sentiment.join(',')})`);
    }

    let result = await client.getListeningTopicMessages(ctx.input.topicId, {
      filters,
      fields: ctx.input.fields,
      metrics: ctx.input.metrics,
      sort: ctx.input.sort,
      timezone: ctx.input.timezone,
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let messages = result?.data ?? [];
    let paging = result?.paging
      ? {
          currentPage: result.paging.current_page,
          totalPages: result.paging.total_pages
        }
      : undefined;

    return {
      output: { messages, paging },
      message: `Retrieved **${messages.length}** listening messages from topic ${ctx.input.topicId}.`
    };
  });

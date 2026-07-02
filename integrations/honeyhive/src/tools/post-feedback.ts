import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let postFeedback = SlateTool.create(spec, {
  name: 'Post Feedback',
  key: 'post_feedback',
  description: `Post user feedback or quality metrics against a specific event or session. Feedback data is used for monitoring, building evaluation datasets, and improving AI outputs over time.`,
  instructions: [
    'Feedback is a freeform JSON object. Common patterns include { "rating": 5 }, { "thumbs_up": true }, or { "comment": "..." }.',
    'Metrics are also freeform and can track numeric quality scores, latencies, etc.'
  ]
})
  .input(
    z.object({
      eventId: z.string().describe('ID of the event or session to attach feedback to'),
      feedback: z
        .record(z.string(), z.any())
        .optional()
        .describe('Feedback data (e.g., { "rating": 5, "comment": "Good" })'),
      metrics: z
        .record(z.string(), z.any())
        .optional()
        .describe('Quality metrics (e.g., { "accuracy": 0.95 })'),
      userProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('User properties to associate'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional metadata to attach')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the feedback was posted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.config.serverUrl
    });

    await client.updateEvent({
      event_id: ctx.input.eventId,
      feedback: ctx.input.feedback,
      metrics: ctx.input.metrics,
      user_properties: ctx.input.userProperties,
      metadata: ctx.input.metadata
    });

    return {
      output: { success: true },
      message: `Posted feedback to event \`${ctx.input.eventId}\`.`
    };
  })
  .build();

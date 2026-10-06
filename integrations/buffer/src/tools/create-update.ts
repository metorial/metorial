import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { assetsSchema, metadataSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createUpdateTool = SlateTool.create(spec, {
  name: 'Create Update',
  key: 'create_update',
  description: `Create a post for one or more profiles. By default it enters the publishing queue; saveToDraft creates an unpublished draft on the current API. now publishes immediately. Multi-profile creation is not atomic.`,
  tags: { readOnly: false },
  constraints: [
    'Verify the target profiles before publishing. If one profile fails, earlier creations can remain; read them back before retrying.'
  ],
  instructions: [
    'Provide at least one profile ID in profileIds. Use the Get Profiles tool first if you need to find profile IDs.',
    'Use `now: true` to share immediately, or `scheduledAt` for a specific time. By default the update is added to the queue.'
  ]
})
  .input(
    z.object({
      text: z.string().describe('The text content of the update'),
      saveToDraft: z
        .boolean()
        .optional()
        .describe(
          'Current API only: save an unpublished draft instead of queueing or publishing. Cannot be combined with now, top or scheduledAt.'
        ),
      assets: assetsSchema.optional(),
      metadata: metadataSchema.optional(),
      profileIds: z
        .array(z.string())
        .min(1)
        .describe('Array of profile IDs to post the update to'),
      scheduledAt: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp to schedule the update for a specific time'),
      now: z.boolean().optional().describe('Set to true to share the update immediately'),
      top: z
        .boolean()
        .optional()
        .describe('Set to true to add the update to the top of the queue'),
      shorten: z
        .boolean()
        .optional()
        .describe(
          'Legacy REST only: shorten URLs in this post. Current connections use the channel setting; omit this field.'
        ),
      media: z
        .object({
          link: z.string().optional().describe('URL of a link attachment'),
          title: z.string().optional().describe('Title for the link attachment'),
          description: z.string().optional().describe('Description for the link attachment'),
          picture: z.string().optional().describe('URL of a preview image for the link'),
          photo: z.string().optional().describe('URL of a photo to attach'),
          thumbnail: z.string().optional().describe('URL of a thumbnail image')
        })
        .optional()
        .describe('Media attachments for the update')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was created successfully'),
      updates: z
        .array(
          z.object({
            updateId: z.string().describe('Unique identifier of the created update'),
            profileId: z.string().describe('Profile ID the update was created for'),
            status: z.string().describe('Status of the update (e.g. buffer, sent)'),
            text: z.string().describe('Text content of the update'),
            dueAt: z
              .number()
              .optional()
              .describe('Unix seconds when scheduled; omitted for unscheduled drafts'),
            createdAt: z
              .number()
              .optional()
              .describe('Unix seconds when supplied by the provider')
          })
        )
        .describe('Created updates (one per profile)'),
      bufferCount: z.number().optional().describe('Legacy provider count, when supplied'),
      bufferPercentage: z
        .number()
        .optional()
        .describe('Legacy provider capacity percentage, when supplied')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let result = await client.createUpdate({
      text: ctx.input.text,
      profileIds: ctx.input.profileIds,
      scheduledAt: ctx.input.scheduledAt,
      now: ctx.input.now,
      top: ctx.input.top,
      shorten: ctx.input.shorten,
      media: ctx.input.media,
      saveToDraft: ctx.input.saveToDraft,
      assets: ctx.input.assets,
      metadata: ctx.input.metadata
    });

    let updates = result.updates.map(u => ({
      updateId: u.id,
      profileId: u.profileId,
      status: u.status,
      text: u.text,
      dueAt: u.dueAt,
      createdAt: u.createdAt
    }));

    let action = ctx.input.saveToDraft
      ? 'saved as drafts'
      : ctx.input.now
        ? 'created for immediate publication'
        : ctx.input.scheduledAt
          ? 'scheduled'
          : 'queued';

    return {
      output: {
        success: result.success,
        updates,
        bufferCount: result.buffer_count,
        bufferPercentage: result.buffer_percentage
      },
      message: `Successfully ${action} **${updates.length}** update(s) across profiles.${ctx.input.now ? ' Check the returned post statuses or Get Updates to verify delivery.' : ''}`
    };
  })
  .build();

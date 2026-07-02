import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createUpdateTool = SlateTool.create(spec, {
  name: 'Create Update',
  key: 'create_update',
  description: `Create a new social media update (post) and add it to the queue for one or more profiles. Supports scheduling, immediate sharing, media attachments, and queue positioning.`,
  instructions: [
    'Provide at least one profile ID in profileIds. Use the Get Profiles tool first if you need to find profile IDs.',
    'Use `now: true` to share immediately, or `scheduledAt` for a specific time. By default the update is added to the queue.'
  ]
})
  .input(
    z.object({
      text: z.string().describe('The text content of the update'),
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
        .describe('Set to true to automatically shorten URLs in the text'),
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
            dueAt: z.number().describe('Unix timestamp when the update is due'),
            createdAt: z.number().describe('Unix timestamp when the update was created')
          })
        )
        .describe('Created updates (one per profile)'),
      bufferCount: z.number().describe('Total number of updates in the buffer after creation'),
      bufferPercentage: z.number().describe('Percentage of buffer capacity used')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createUpdate({
      text: ctx.input.text,
      profileIds: ctx.input.profileIds,
      scheduledAt: ctx.input.scheduledAt,
      now: ctx.input.now,
      top: ctx.input.top,
      shorten: ctx.input.shorten,
      media: ctx.input.media
    });

    let updates = (result.updates || []).map(u => ({
      updateId: u.id,
      profileId: u.profileId,
      status: u.status,
      text: u.text,
      dueAt: u.dueAt,
      createdAt: u.createdAt
    }));

    let action = ctx.input.now
      ? 'shared immediately'
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
      message: `Successfully ${action} **${updates.length}** update(s) across profiles.`
    };
  })
  .build();

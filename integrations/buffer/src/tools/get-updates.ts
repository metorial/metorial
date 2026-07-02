import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let updateSchema = z.object({
  updateId: z.string().describe('Unique identifier for the update'),
  text: z.string().describe('Text content of the update'),
  status: z.string().describe('Status of the update (e.g. buffer, sent)'),
  profileId: z.string().describe('Profile ID this update belongs to'),
  profileService: z.string().describe('Social network service name'),
  createdAt: z.number().describe('Unix timestamp when the update was created'),
  dueAt: z.number().describe('Unix timestamp when the update is/was due'),
  sentAt: z.number().describe('Unix timestamp when the update was sent (0 if pending)'),
  day: z.string().describe('Day the update is scheduled for'),
  dueTime: z.string().describe('Time the update is due'),
  serviceUpdateId: z.string().describe('ID of the update on the social network'),
  statistics: z
    .record(z.string(), z.number())
    .describe('Engagement statistics (reach, clicks, retweets, favorites, mentions)'),
  media: z
    .object({
      link: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      picture: z.string().optional(),
      photo: z.string().optional(),
      thumbnail: z.string().optional()
    })
    .optional()
    .describe('Attached media')
});

export let getUpdatesTool = SlateTool.create(spec, {
  name: 'Get Updates',
  key: 'get_updates',
  description: `Retrieve updates (posts) for a social media profile. Supports fetching pending (queued) updates, sent updates, or a single update by ID. Sent updates include engagement statistics.`,
  instructions: [
    'Set `status` to "pending" to get queued updates or "sent" to get published updates.',
    'Use `updateId` to retrieve a single specific update regardless of status.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      profileId: z
        .string()
        .optional()
        .describe(
          'Profile ID to retrieve updates for. Required when fetching pending or sent updates.'
        ),
      updateId: z
        .string()
        .optional()
        .describe(
          'Specific update ID to retrieve. When provided, profileId and status are ignored.'
        ),
      status: z
        .enum(['pending', 'sent'])
        .default('pending')
        .describe('Which updates to retrieve: pending (queued) or sent (published)'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      count: z.number().optional().describe('Number of updates to return per page'),
      since: z
        .string()
        .optional()
        .describe('Unix timestamp or ISO date to filter updates since this time'),
      utc: z.boolean().optional().describe('Set to true to return times in UTC')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of updates matching the query'),
      updates: z.array(updateSchema).describe('List of updates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.updateId) {
      let update = await client.getUpdate(ctx.input.updateId);
      let mapped = {
        updateId: update.id,
        text: update.text,
        status: update.status,
        profileId: update.profileId,
        profileService: update.profileService,
        createdAt: update.createdAt,
        dueAt: update.dueAt,
        sentAt: update.sentAt,
        day: update.day,
        dueTime: update.dueTime,
        serviceUpdateId: update.serviceUpdateId,
        statistics: update.statistics || {},
        media: update.media
      };

      return {
        output: { total: 1, updates: [mapped] },
        message: `Retrieved update **${update.id}** (${update.status}).`
      };
    }

    if (!ctx.input.profileId) {
      throw new Error('profileId is required when not using updateId');
    }

    let options = {
      page: ctx.input.page,
      count: ctx.input.count,
      since: ctx.input.since,
      utc: ctx.input.utc
    };

    let result: any;
    if (ctx.input.status === 'sent') {
      result = await client.getSentUpdates(ctx.input.profileId, options);
    } else {
      result = await client.getPendingUpdates(ctx.input.profileId, options);
    }

    let updates = (result.updates || []).map((u: any) => ({
      updateId: u.id,
      text: u.text,
      status: u.status,
      profileId: u.profileId,
      profileService: u.profileService,
      createdAt: u.createdAt,
      dueAt: u.dueAt,
      sentAt: u.sentAt,
      day: u.day,
      dueTime: u.dueTime,
      serviceUpdateId: u.serviceUpdateId,
      statistics: u.statistics || {},
      media: u.media
    }));

    return {
      output: {
        total: result.total,
        updates
      },
      message: `Retrieved **${updates.length}** ${ctx.input.status} update(s) (${result.total} total).`
    };
  })
  .build();

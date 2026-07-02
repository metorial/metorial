import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlaygroundClient } from '../lib/client';
import { spec } from '../spec';

export let listAvatars = SlateTool.create(spec, {
  name: 'List Avatars',
  key: 'list_avatars',
  description: `List AI avatars with optional filters for title, status, and date range. Also supports fetching detailed information for a specific avatar by ID, including processing and consent verification results. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      avatarId: z
        .string()
        .optional()
        .describe('If provided, returns detailed info for this specific avatar'),
      title: z.string().optional().describe('Filter avatars by title'),
      status: z
        .array(
          z.enum([
            'consent_pending',
            'processing',
            'consent_failed',
            'failed',
            'published',
            'deleted'
          ])
        )
        .optional()
        .describe('Filter by status'),
      skip: z.number().optional().describe('Number of records to skip'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of records to return (default 10)'),
      startDatetime: z
        .string()
        .optional()
        .describe('Filter avatars created after this ISO 8601 datetime'),
      endDatetime: z
        .string()
        .optional()
        .describe('Filter avatars created before this ISO 8601 datetime')
    })
  )
  .output(
    z.object({
      totalAvatars: z.number().optional().describe('Total number of matching avatars'),
      avatars: z.array(
        z.object({
          avatarId: z.string().describe('Unique avatar identifier'),
          title: z.string().nullable().describe('Avatar display name'),
          thumbnail: z.string().nullable().describe('Thumbnail image URL'),
          status: z.string().describe('Current status'),
          baseVideo: z.string().nullable().describe('Base video URL'),
          createdAt: z.string().nullable().describe('ISO 8601 creation timestamp'),
          processingResults: z
            .array(
              z.object({
                checkName: z.string(),
                checkStatus: z.string()
              })
            )
            .nullable()
            .optional()
            .describe('Avatar processing check results'),
          consentResults: z
            .array(
              z.object({
                checkName: z.string(),
                checkStatus: z.string()
              })
            )
            .nullable()
            .optional()
            .describe('Consent verification check results')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlaygroundClient(ctx.auth.token);

    if (ctx.input.avatarId) {
      let details = await client.getAvatarDetails(ctx.input.avatarId);
      return {
        output: {
          totalAvatars: 1,
          avatars: [
            {
              avatarId: details.avatar_id,
              title: details.title,
              thumbnail: details.thumbnail,
              status: details.status,
              baseVideo: details.base_video,
              createdAt: details.created_at,
              processingResults:
                details.avatar_processing_results?.map(r => ({
                  checkName: r.check_name,
                  checkStatus: r.check_status
                })) ?? null,
              consentResults:
                details.consent_verification_results?.map(r => ({
                  checkName: r.check_name,
                  checkStatus: r.check_status
                })) ?? null
            }
          ]
        },
        message: `Retrieved details for avatar **${details.title || details.avatar_id}** (status: ${details.status}).`
      };
    }

    let result = await client.listAvatars({
      title: ctx.input.title,
      status: ctx.input.status,
      skip: ctx.input.skip,
      limit: ctx.input.limit,
      startDatetime: ctx.input.startDatetime,
      endDatetime: ctx.input.endDatetime
    });

    return {
      output: {
        totalAvatars: result.total_avatars,
        avatars: result.avatars_list.map(a => ({
          avatarId: a.avatar_id,
          title: a.title,
          thumbnail: a.thumbnail,
          status: a.status,
          baseVideo: a.base_video,
          createdAt: a.created_at
        }))
      },
      message: `Found **${result.total_avatars}** avatars.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getContent = SlateTool.create(spec, {
  name: 'Get Content',
  key: 'get_content',
  description: `Retrieves a specific content item (flow, checklist, or launcher) by ID. Can also list content versions and content sessions for a given content item.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contentId: z.string().describe('ID of the content to retrieve'),
      expand: z
        .array(z.string())
        .optional()
        .describe('Related objects to expand (e.g. draft_version, published_version)'),
      versionsLimit: z.number().optional().describe('Maximum versions to return (1–100).'),
      versionsStartingAfter: z
        .string()
        .optional()
        .describe('Last version ID from the previous page.'),
      sessionsStartingAfter: z
        .string()
        .optional()
        .describe('Last session ID from the previous page.'),
      includeVersions: z
        .boolean()
        .optional()
        .describe('If true, also fetches content versions'),
      includeSessions: z
        .boolean()
        .optional()
        .describe('If true, also fetches content sessions'),
      sessionsLimit: z.number().optional().describe('Maximum number of sessions to return')
    })
  )
  .output(
    z.object({
      contentId: z.string().describe('ID of the content'),
      name: z.string().describe('Name of the content'),
      type: z.enum(['flow', 'checklist', 'launcher']).describe('Type of content'),
      draftVersionId: z.string().nullable().describe('ID of the draft version'),
      publishedVersionId: z.string().nullable().describe('ID of the published version'),
      draftVersion: z
        .record(z.string(), z.unknown())
        .nullable()
        .optional()
        .describe('Draft version when expanded'),
      publishedVersion: z
        .record(z.string(), z.unknown())
        .nullable()
        .optional()
        .describe('Published version when expanded'),
      createdAt: z.string().describe('Timestamp when the content was created'),
      versionsHasMore: z.boolean().optional().describe('Whether more versions are available'),
      versionsNextPageUrl: z
        .string()
        .nullable()
        .optional()
        .describe('URL for the next versions page'),
      sessionsHasMore: z.boolean().optional().describe('Whether more sessions are available'),
      sessionsNextPageUrl: z
        .string()
        .nullable()
        .optional()
        .describe('URL for the next sessions page'),
      versions: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Content versions if requested'),
      sessions: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Content sessions if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    let content = await client.getContent(ctx.input.contentId, ctx.input.expand);

    let versions: Record<string, unknown>[] | undefined;
    let versionsHasMore: boolean | undefined;
    let versionsNextPageUrl: string | null | undefined;
    if (ctx.input.includeVersions) {
      let versionsResult = await client.listContentVersions({
        contentId: ctx.input.contentId,
        limit: ctx.input.versionsLimit,
        startingAfter: ctx.input.versionsStartingAfter
      });
      versions = versionsResult.data;
      versionsHasMore = versionsResult.has_more;
      versionsNextPageUrl = versionsResult.next_page_url;
    }

    let sessions: Record<string, unknown>[] | undefined;
    let sessionsHasMore: boolean | undefined;
    let sessionsNextPageUrl: string | null | undefined;
    if (ctx.input.includeSessions) {
      let sessionsResult = await client.listContentSessions({
        contentId: ctx.input.contentId,
        limit: ctx.input.sessionsLimit,
        startingAfter: ctx.input.sessionsStartingAfter
      });
      sessions = sessionsResult.data;
      sessionsHasMore = sessionsResult.has_more;
      sessionsNextPageUrl = sessionsResult.next_page_url;
    }

    return {
      output: {
        contentId: content.id,
        name: content.name,
        type: content.type,
        draftVersionId: content.draft_version_id,
        publishedVersionId: content.published_version_id,
        draftVersion: content.draft_version,
        publishedVersion: content.published_version,
        createdAt: content.created_at,
        versions,
        versionsHasMore,
        versionsNextPageUrl,
        sessions,
        sessionsHasMore,
        sessionsNextPageUrl
      },
      message: `Retrieved content **${content.name}** (${content.type}).${versions ? ` Includes ${versions.length} version(s).` : ''}${sessions ? ` Includes ${sessions.length} session(s).` : ''}`
    };
  })
  .build();

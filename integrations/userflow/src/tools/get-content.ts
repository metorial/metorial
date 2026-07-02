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
      createdAt: z.string().describe('Timestamp when the content was created'),
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
    if (ctx.input.includeVersions) {
      let versionsResult = await client.listContentVersions({
        contentId: ctx.input.contentId
      });
      versions = versionsResult.data;
    }

    let sessions: Record<string, unknown>[] | undefined;
    if (ctx.input.includeSessions) {
      let sessionsResult = await client.listContentSessions({
        contentId: ctx.input.contentId,
        limit: ctx.input.sessionsLimit
      });
      sessions = sessionsResult.data as unknown as Record<string, unknown>[];
    }

    return {
      output: {
        contentId: content.id,
        name: content.name,
        type: content.type,
        draftVersionId: content.draft_version_id,
        publishedVersionId: content.published_version_id,
        createdAt: content.created_at,
        versions,
        sessions
      },
      message: `Retrieved content **${content.name}** (${content.type}).${versions ? ` Includes ${versions.length} version(s).` : ''}${sessions ? ` Includes ${sessions.length} session(s).` : ''}`
    };
  })
  .build();

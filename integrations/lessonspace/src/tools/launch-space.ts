import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let launchSpace = SlateTool.create(spec, {
  name: 'Launch Space',
  key: 'launch_space',
  description: `Creates a new virtual classroom space or retrieves an existing one, and generates a join URL for a user. Use this to set up a teaching session with configured recording, transcription, features, and user roles. Returns the join URL that can be embedded in an iframe or used for redirection.`,
  instructions: [
    'The space `spaceId` uniquely identifies the space. Using the same ID retrieves the existing space rather than creating a new one.',
    'To create a join link for multiple users, call this tool once per user with the same `spaceId` but different `user` configurations.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      spaceId: z
        .string()
        .min(1)
        .max(64)
        .describe(
          'Unique identifier for the space. Reusing the same ID returns the existing space.'
        ),
      name: z
        .string()
        .max(128)
        .optional()
        .describe('Display name for the space. Defaults to the spaceId if not provided.'),
      allowGuests: z
        .boolean()
        .optional()
        .describe('Whether guests can join the space without authentication.'),
      recordAv: z
        .boolean()
        .optional()
        .describe('Enable or disable audio/video recording for the space.'),
      recordContent: z
        .boolean()
        .optional()
        .describe(
          'Enable or disable content recording (whiteboard, documents) separately from AV.'
        ),
      transcribe: z
        .boolean()
        .optional()
        .describe('Enable transcription generation for the session.'),
      summarise: z
        .boolean()
        .optional()
        .describe('Enable AI-generated lesson summary for the session.'),
      user: z
        .object({
          userId: z
            .string()
            .optional()
            .describe('Unique identifier for the joining user. Defaults to the user name.'),
          name: z.string().optional().describe('Display name of the joining user.'),
          email: z
            .string()
            .optional()
            .describe(
              'Email of the joining user. Links them to a Lessonspace account if it exists.'
            ),
          leader: z
            .boolean()
            .optional()
            .describe(
              'Whether the user has leader privileges (e.g., muting others, forcing view follow).'
            )
        })
        .optional()
        .describe('Configuration for the user joining the space.'),
      features: z
        .record(z.string(), z.boolean())
        .optional()
        .describe('Feature toggles for the joining user (e.g., chat, whiteboard tools).'),
      theme: z
        .record(z.string(), z.string())
        .optional()
        .describe('UI theme overrides for the joining user.'),
      videoLayoutMode: z
        .enum(['grid', 'sidebar', 'floating'])
        .optional()
        .describe('Default video arrangement layout.'),
      locale: z
        .enum(['en', 'fr', 'it', 'pl'])
        .optional()
        .describe('Language setting for the space UI.'),
      server: z.string().optional().describe('Regional server preference for low latency.'),
      sessionTags: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value tags to attach to the session for filtering.'),
      spaceTags: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value tags to attach to the space for filtering.'),
      inviteUrl: z
        .string()
        .optional()
        .describe('Custom URL for the invite button within the space.'),
      resourceUrl: z
        .string()
        .optional()
        .describe('Custom URL for the resource library within the space.'),
      notBefore: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp. Users cannot access the space before this time.'),
      notAfter: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp. Users cannot access the space after this time.')
    })
  )
  .output(
    z.object({
      clientUrl: z
        .string()
        .describe(
          'The URL for the user to join the space. Can be used directly or embedded in an iframe.'
        ),
      apiBase: z.string().describe('The region-specific API base URL for the space.'),
      roomId: z.string().describe('The unique UUID of the space in Lessonspace.'),
      secret: z
        .string()
        .describe('Secret key for direct space API access. Keep this confidential.'),
      sessionId: z
        .string()
        .describe('ID of the upcoming session. Changes only after a session starts and ends.'),
      userId: z.number().describe('Internal Lessonspace user ID for the joining user.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organisationId: ctx.config.organisationId
    });

    let result = await client.launchSpace({
      id: ctx.input.spaceId,
      name: ctx.input.name,
      allowGuests: ctx.input.allowGuests,
      recordAv: ctx.input.recordAv,
      recordContent: ctx.input.recordContent,
      transcribe: ctx.input.transcribe,
      summarise: ctx.input.summarise,
      user: ctx.input.user
        ? {
            id: ctx.input.user.userId,
            name: ctx.input.user.name,
            email: ctx.input.user.email,
            leader: ctx.input.user.leader
          }
        : undefined,
      features: ctx.input.features,
      theme: ctx.input.theme,
      videoLayoutMode: ctx.input.videoLayoutMode,
      locale: ctx.input.locale,
      server: ctx.input.server,
      sessionTags: ctx.input.sessionTags,
      spaceTags: ctx.input.spaceTags,
      inviteUrl: ctx.input.inviteUrl,
      resourceUrl: ctx.input.resourceUrl,
      timeouts:
        ctx.input.notBefore || ctx.input.notAfter
          ? {
              notBefore: ctx.input.notBefore,
              notAfter: ctx.input.notAfter
            }
          : undefined
    });

    return {
      output: {
        clientUrl: result.clientUrl,
        apiBase: result.apiBase,
        roomId: result.roomId,
        secret: result.secret,
        sessionId: result.sessionId,
        userId: result.userId
      },
      message: `Space **${ctx.input.name || ctx.input.spaceId}** launched successfully. Join URL: ${result.clientUrl}`
    };
  })
  .build();

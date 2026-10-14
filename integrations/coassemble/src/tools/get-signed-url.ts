import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSignedUrl = SlateTool.create(spec, {
  name: 'Get Signed URL',
  key: 'get_signed_url',
  description: `Generate a signed URL for embedding a Coassemble course in an iframe. Supports two modes:
- **View mode**: Embeds the course player for learners (requires a course ID).
- **Edit mode**: Embeds the course builder for content creators with optional AI-powered flows.

The returned URL can be used as the \`src\` attribute of an iframe element.`,
  instructions: [
    'For view mode, the courseId is required. For edit mode, courseId is optional (omit it to create a new course).',
    'The flow option only applies to edit mode and controls the creation experience.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['view', 'edit'])
        .describe('Whether to embed the course viewer or course builder'),
      courseId: z
        .string()
        .optional()
        .describe('Course ID (required for view, optional for edit)'),
      identifier: z.string().describe('Unique user identifier from your system'),
      clientIdentifier: z.string().optional().describe('Client/tenant identifier'),
      themeId: z.number().optional().describe('Theme ID to render the embedded course with'),
      name: z.string().optional().describe('Display name for the learner'),
      avatar: z.string().optional().describe('Avatar URL for the learner'),
      flow: z
        .enum(['generate', 'transform', 'convert', 'preview'])
        .optional()
        .describe(
          'Creation flow for edit mode: generate (AI), transform (document), convert (presentation), preview'
        ),
      back: z.enum(['event', 'hidden', 'native']).optional().describe('Back button behavior'),
      color: z.string().optional().describe('Primary hex color for theming (e.g. #FF5733)'),
      language: z.string().optional().describe('ISO 639-1 language code override'),
      translations: z.boolean().optional().describe('Enable translations feature'),
      feedback: z.boolean().optional().describe('Enable feedback feature'),
      googleDrive: z.boolean().optional().describe('Enable Google Drive integration'),
      oneDrive: z.boolean().optional().describe('Enable OneDrive integration'),
      loom: z.boolean().optional().describe('Enable Loom integration'),
      narrations: z.boolean().optional().describe('Enable narrations feature'),
      ai: z.boolean().optional().describe('Enable AI features'),
      publishing: z.boolean().optional().describe('Enable publishing feature')
    })
  )
  .output(
    z.object({
      signedUrl: z.string().describe('The signed URL to embed in an iframe'),
      response: z.record(z.string(), z.any()).optional().describe('Full response from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.auth.userId,
      authScheme: ctx.auth.authScheme
    });

    let options = pickDefined({
      flow: ctx.input.flow,
      back: ctx.input.back,
      color: ctx.input.color,
      language: ctx.input.language,
      translations: ctx.input.translations,
      feedback: ctx.input.feedback,
      googleDrive: ctx.input.googleDrive,
      oneDrive: ctx.input.oneDrive,
      loom: ctx.input.loom,
      narrations: ctx.input.narrations,
      ai: ctx.input.ai,
      publishing: ctx.input.publishing
    });

    let result = await client.getSignedUrl({
      action: ctx.input.action,
      id: ctx.input.courseId,
      identifier: ctx.input.identifier,
      clientIdentifier: ctx.input.clientIdentifier,
      themeId: ctx.input.themeId,
      name: ctx.input.name,
      avatar: ctx.input.avatar,
      options: Object.keys(options).length > 0 ? options : undefined
    });

    let url = typeof result === 'string' ? result : (result?.url ?? result?.signedUrl ?? '');
    if (typeof url !== 'string' || !url.trim()) {
      throw createApiServiceError('Coassemble did not return a signed URL.');
    }

    return {
      output: {
        signedUrl: url,
        response: typeof result === 'object' ? result : undefined
      },
      message: `Generated a signed **${ctx.input.action}** URL for identifier \`${ctx.input.identifier}\`.`
    };
  })
  .build();

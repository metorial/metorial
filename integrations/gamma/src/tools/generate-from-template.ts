import { SlateTool } from 'slates';
import { z } from 'zod';
import { GammaClient } from '../lib/client';
import { spec } from '../spec';

export let generateFromTemplateTool = SlateTool.create(spec, {
  name: 'Generate from Template',
  key: 'generate_from_template',
  description: `Create new content based on an existing Gamma template. Provide a template ID and a prompt describing how to adapt or rework it.
Useful for producing personalized variations of a master template at scale (e.g., customized pitch decks per client).
The generated content inherits the template's structure and image settings, with optional overrides for theme and image style.`,
  instructions: [
    'The gammaId can be found in the Gamma app by locating the template and copying its identifier from the URL.',
    'The prompt can be brief or extensive - it describes how to adapt the template content.',
    'Image settings from the template are inherited. Only override imageOptions if you want to change the AI image model or style.'
  ],
  constraints: [
    'Requires an existing Gamma template (gammaId).',
    'Prompt limit: ~100,000 tokens (~400,000 characters).',
    'This API is currently in beta.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      gammaId: z.string().describe('ID of the existing Gamma template to base content on'),
      prompt: z
        .string()
        .describe('Text, image URLs, and instructions for adapting the template'),
      themeId: z
        .string()
        .optional()
        .describe(
          "Theme ID to apply. Defaults to the template's current theme. Use List Themes tool to find available themes."
        ),
      folderIds: z
        .array(z.string())
        .optional()
        .describe(
          'Folder IDs to organize content into. Use List Folders tool to find available folders.'
        ),
      exportAs: z
        .enum(['pdf', 'pptx'])
        .optional()
        .describe('Export format in addition to the Gamma web URL'),
      imageOptions: z
        .object({
          model: z
            .string()
            .optional()
            .describe(
              'AI image model (e.g. "imagen-4-pro", "flux-1-pro"). Only relevant for templates with AI-generated images.'
            ),
          style: z
            .string()
            .optional()
            .describe('Artistic style for images (max 500 chars), e.g. "photorealistic"')
        })
        .optional()
        .describe('Override image settings from the template'),
      sharingOptions: z
        .object({
          workspaceAccess: z
            .enum(['noAccess', 'view', 'comment', 'edit', 'fullAccess'])
            .optional()
            .describe('Access level for workspace members'),
          externalAccess: z
            .enum(['noAccess', 'view', 'comment', 'edit'])
            .optional()
            .describe('Access level for external viewers'),
          emailOptions: z
            .object({
              recipients: z
                .array(z.string())
                .optional()
                .describe('Email addresses to share with'),
              access: z
                .enum(['view', 'comment', 'edit', 'fullAccess'])
                .optional()
                .describe('Access level for email recipients')
            })
            .optional()
            .describe('Email sharing configuration')
        })
        .optional()
        .describe('Sharing and access control options')
    })
  )
  .output(
    z.object({
      generationId: z
        .string()
        .describe(
          'Unique ID for tracking the generation. Use Get Generation Status tool to check progress.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new GammaClient(ctx.auth.token);

    let result = await client.generateFromTemplate({
      gammaId: ctx.input.gammaId,
      prompt: ctx.input.prompt,
      themeId: ctx.input.themeId,
      folderIds: ctx.input.folderIds,
      exportAs: ctx.input.exportAs,
      imageOptions: ctx.input.imageOptions,
      sharingOptions: ctx.input.sharingOptions
    });

    ctx.info(`Template generation started: ${result.generationId}`);

    return {
      output: {
        generationId: result.generationId
      },
      message: `Template-based generation started. Generation ID: **${result.generationId}**. Use the Get Generation Status tool to check progress and retrieve the result URL.`
    };
  });

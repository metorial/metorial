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
    'Use search_templates to discover workspace template IDs. Official explore templates are not accepted. Generation validates template eligibility.',
    'The prompt can be brief or extensive - it describes how to adapt the template content.',
    'Image settings from the template are inherited. Only override imageOptions if you want to change the AI image model or style.'
  ],
  constraints: [
    'Requires an existing Gamma template (gammaId).',
    'Prompt limit: ~100,000 tokens (~400,000 characters).',
    'The template must contain exactly one page; multi-page or site-bound templates may be rejected.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      gammaId: z
        .string()
        .min(1)
        .describe(
          'Workspace template file ID from search_templates; explore template IDs are not accepted'
        ),
      prompt: z
        .string()
        .min(1)
        .max(400000)
        .describe('Text, image URLs, and instructions for adapting the template'),
      title: z
        .string()
        .min(1)
        .max(500)
        .optional()
        .describe('Custom title for the generated Gamma (1-500 characters)'),
      themeId: z
        .string()
        .optional()
        .describe(
          "Theme ID to apply. Defaults to the template's current theme. Use List Themes tool to find available themes."
        ),
      folderId: z
        .string()
        .min(1)
        .optional()
        .describe('Folder ID from list_folders. Takes precedence over folderIds.'),
      folderIds: z
        .array(z.string())
        .optional()
        .describe(
          'Legacy array accepting at most one folder ID from list_folders. Ignored when folderId is provided.'
        ),
      exportAs: z
        .enum(['pdf', 'pptx', 'png'])
        .optional()
        .describe(
          'Optional downloadable export: PDF, PPTX, or a ZIP containing one PNG per card'
        ),
      imageOptions: z
        .object({
          model: z
            .string()
            .optional()
            .describe(
              'AI image model (e.g. "gpt-image-2", "flux-1-pro"). Only relevant for templates with AI-generated images.'
            ),
          style: z
            .string()
            .max(5000)
            .optional()
            .describe('Artistic style for images (max 5000 chars), e.g. "photorealistic"')
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
        ),
      warnings: z
        .string()
        .optional()
        .describe('Provider warnings about ignored or adjusted options')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GammaClient(ctx.auth.token);

    let result = await client.generateFromTemplate({
      gammaId: ctx.input.gammaId,
      prompt: ctx.input.prompt,
      title: ctx.input.title,
      themeId: ctx.input.themeId,
      folderId: ctx.input.folderId,
      folderIds: ctx.input.folderIds,
      exportAs: ctx.input.exportAs,
      imageOptions: ctx.input.imageOptions,
      sharingOptions: ctx.input.sharingOptions
    });

    ctx.info(`Template generation started: ${result.generationId}`);

    return {
      output: {
        generationId: result.generationId,
        warnings: result.warnings ?? undefined
      },
      message: `Template-based generation started. Generation ID: **${result.generationId}**. Use the Get Generation Status tool to check progress and retrieve the result URL.`
    };
  });

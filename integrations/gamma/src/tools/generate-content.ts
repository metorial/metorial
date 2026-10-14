import { SlateTool } from 'slates';
import { z } from 'zod';
import { GammaClient } from '../lib/client';
import { spec } from '../spec';

let headerFooterPositionSchema = z
  .object({
    type: z.enum(['text', 'image', 'cardNumber']).describe('Content type for this position'),
    value: z
      .string()
      .optional()
      .describe('Required text value when type is "text". Use src for custom images.'),
    source: z
      .string()
      .optional()
      .describe('Image source, e.g. "themeLogo" or "custom" (for type "image")'),
    src: z.string().optional().describe('Image URL when source is "custom"'),
    size: z.string().optional().describe('Image size: sm, md, lg, or xl')
  })
  .describe('Header/footer position configuration');

let headerFooterSchema = z
  .object({
    topLeft: headerFooterPositionSchema.optional(),
    topCenter: headerFooterPositionSchema.optional(),
    topRight: headerFooterPositionSchema.optional(),
    bottomLeft: headerFooterPositionSchema.optional(),
    bottomCenter: headerFooterPositionSchema.optional(),
    bottomRight: headerFooterPositionSchema.optional(),
    hideFromFirstCard: z
      .boolean()
      .optional()
      .describe('Hide header/footer from the first card'),
    hideFromLastCard: z.boolean().optional().describe('Hide header/footer from the last card')
  })
  .describe('Header and footer configuration with six positions');

let sharingOptionsSchema = z
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
        recipients: z.array(z.string()).optional().describe('Email addresses to share with'),
        access: z
          .enum(['view', 'comment', 'edit', 'fullAccess'])
          .optional()
          .describe('Access level for email recipients')
      })
      .optional()
      .describe('Email sharing configuration')
  })
  .describe('Sharing and access control options');

export let generateContentTool = SlateTool.create(spec, {
  name: 'Generate Content',
  key: 'generate_content',
  description: `Generate AI-powered presentations, documents, social media posts, or webpages from a text prompt.
Input can range from a brief one-line prompt to extensive structured notes (up to ~400k characters).
Three text modes control how input is handled: **generate** (expand/rewrite), **condense** (summarize), or **preserve** (keep as-is).
Optionally configure tone, audience, language, number of cards, image sourcing, themes, card dimensions, headers/footers, sharing permissions, and export format.`,
  instructions: [
    'Use textMode "generate" for short prompts that need expansion, "condense" for long text that needs summarizing, and "preserve" to keep input text as-is.',
    'Use "\\n---\\n" in inputText to create explicit card breaks when cardSplit is set to "inputTextBreaks".',
    'Retrieve themeId using the List Themes tool and folderIds using the List Folders tool before generating.',
    'Export links are temporary - download PDF, PPTX, or PNG ZIP files promptly after generation completes.'
  ],
  constraints: [
    'Pro, Ultra, Teams, Business, and Enterprise plans: 1-75 cards.',
    'inputText limit: ~100,000 tokens (~400,000 characters).',
    'additionalInstructions limit: 5,000 characters.',
    'tone and audience limit: 500 characters each.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      inputText: z
        .string()
        .min(1)
        .max(400000)
        .describe(
          'Text content or prompt to generate from. Can include image URLs. Use "\\n---\\n" for explicit card breaks.'
        ),
      textMode: z
        .enum(['generate', 'condense', 'preserve'])
        .optional()
        .describe(
          'How input text is handled: generate (expand/rewrite), condense (summarize), or preserve (keep as-is)'
        ),
      title: z
        .string()
        .min(1)
        .max(500)
        .optional()
        .describe('Custom title for the generated Gamma (1-500 characters)'),
      format: z
        .enum(['presentation', 'document', 'webpage', 'social'])
        .optional()
        .describe('Output format type. Defaults to "presentation".'),
      themeId: z
        .string()
        .optional()
        .describe('Theme ID to apply. Use List Themes tool to find available themes.'),
      numCards: z
        .number()
        .refine(Number.isSafeInteger, 'Card count must be a whole number.')
        .min(1)
        .max(75)
        .optional()
        .describe(
          'Number of cards/slides to generate (1-75 for supported plans). Defaults to 10.'
        ),
      cardSplit: z
        .enum(['auto', 'inputTextBreaks'])
        .optional()
        .describe(
          'How content is split into cards. "auto" uses numCards, "inputTextBreaks" uses "\\n---\\n" breaks in input.'
        ),
      additionalInstructions: z
        .string()
        .max(5000)
        .optional()
        .describe('Extra instructions for AI (max 5000 chars), e.g. "Make the titles catchy"'),
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
      textOptions: z
        .object({
          amount: z
            .enum(['brief', 'medium', 'detailed', 'extensive'])
            .optional()
            .describe('Text volume per card. Defaults to "medium".'),
          tone: z
            .string()
            .max(500)
            .optional()
            .describe('Tone/voice for the content (max 500 chars)'),
          audience: z
            .string()
            .max(500)
            .optional()
            .describe('Target audience description (max 500 chars)'),
          language: z
            .string()
            .optional()
            .describe('Output language code, e.g. "en", "es", "fr". Defaults to "en".')
        })
        .optional()
        .describe('Text generation options'),
      imageOptions: z
        .object({
          source: z
            .enum([
              'aiGenerated',
              'pictographic',
              'pexels',
              'giphy',
              'webAllImages',
              'webFreeToUse',
              'webFreeToUseCommercially',
              'themeAccent',
              'placeholder',
              'noImages'
            ])
            .optional()
            .describe('Image source. Defaults to "aiGenerated".'),
          model: z
            .string()
            .optional()
            .describe(
              'AI image model (e.g. "gpt-image-2", "flux-1-pro", "dall-e-3"). Only used when source is "aiGenerated".'
            ),
          style: z
            .string()
            .max(5000)
            .optional()
            .describe(
              'Artistic style for images (max 5000 chars), e.g. "photorealistic", "minimal line art"'
            )
        })
        .optional()
        .describe('Image configuration'),
      cardOptions: z
        .object({
          dimensions: z
            .string()
            .optional()
            .describe(
              'Card dimensions. Presentation: "fluid", "16x9", "4x3". Document: "fluid", "pageless", "letter", "a4". Social: "1x1", "4x5", "9x16".'
            ),
          headerFooter: headerFooterSchema.optional()
        })
        .optional()
        .describe('Card layout options'),
      sharingOptions: sharingOptionsSchema.optional()
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

    let result = await client.generate({
      inputText: ctx.input.inputText,
      textMode: ctx.input.textMode,
      title: ctx.input.title,
      format: ctx.input.format,
      themeId: ctx.input.themeId,
      numCards: ctx.input.numCards,
      cardSplit: ctx.input.cardSplit,
      additionalInstructions: ctx.input.additionalInstructions,
      folderId: ctx.input.folderId,
      folderIds: ctx.input.folderIds,
      exportAs: ctx.input.exportAs,
      textOptions: ctx.input.textOptions,
      imageOptions: ctx.input.imageOptions,
      cardOptions: ctx.input.cardOptions,
      sharingOptions: ctx.input.sharingOptions
    });

    ctx.info(`Generation started: ${result.generationId}`);

    return {
      output: {
        generationId: result.generationId,
        warnings: result.warnings ?? undefined
      },
      message: `Content generation started. Generation ID: **${result.generationId}**. Use the Get Generation Status tool to check progress and retrieve the result URL.`
    };
  });

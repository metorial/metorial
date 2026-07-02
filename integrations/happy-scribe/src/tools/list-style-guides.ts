import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listStyleGuides = SlateTool.create(spec, {
  name: 'List Style Guides',
  key: 'list_style_guides',
  description: `List available style guides within an organization. Style guides define transcription and subtitling preferences such as verbatim mode, grammar correction, SDH (Subtitles for the Deaf and Hard of Hearing), speaker identification format, and notation tags.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z
        .string()
        .optional()
        .describe('Organization ID. Falls back to the value in config if not provided.')
    })
  )
  .output(
    z.object({
      styleGuides: z
        .array(
          z.object({
            styleGuideId: z.string().describe('ID of the style guide.'),
            name: z.string().describe('Name of the style guide.'),
            operation: z
              .string()
              .optional()
              .nullable()
              .describe('Operation type (transcription or subtitles).'),
            organizationDefault: z
              .boolean()
              .optional()
              .describe('Whether this is the default style guide for the organization.'),
            verbatim: z
              .boolean()
              .optional()
              .nullable()
              .describe('Whether verbatim mode is enabled.'),
            fixGrammar: z
              .boolean()
              .optional()
              .nullable()
              .describe('Whether grammar correction is enabled.'),
            sdh: z
              .boolean()
              .optional()
              .nullable()
              .describe(
                'Whether SDH (Subtitles for the Deaf and Hard of Hearing) is enabled.'
              ),
            speakerId: z
              .string()
              .optional()
              .nullable()
              .describe('Speaker identification format.'),
            notationTags: z
              .any()
              .optional()
              .nullable()
              .describe('Notation tags configuration.'),
            createdAt: z.string().optional().describe('Creation timestamp.'),
            updatedAt: z.string().optional().describe('Last update timestamp.')
          })
        )
        .describe('List of style guides.')
    })
  )
  .handleInvocation(async ctx => {
    let orgId = ctx.input.organizationId || ctx.config.organizationId;
    if (!orgId) {
      throw new Error(
        'Organization ID is required. Provide it in the input or configure it globally.'
      );
    }

    let client = new Client({ token: ctx.auth.token });
    let result = await client.listStyleGuides(orgId);

    let styleGuides = (result.results || result || []).map((sg: any) => ({
      styleGuideId: sg.id,
      name: sg.name,
      operation: sg.operation,
      organizationDefault: sg.organization_default,
      verbatim: sg.verbatim,
      fixGrammar: sg.fix_grammar,
      sdh: sg.sdh,
      speakerId: sg.speaker_id,
      notationTags: sg.notation_tags,
      createdAt: sg.created_at,
      updatedAt: sg.updated_at
    }));

    return {
      output: {
        styleGuides
      },
      message: `Found **${styleGuides.length}** style guide(s).`
    };
  })
  .build();

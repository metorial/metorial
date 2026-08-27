import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let canvasSectionSchema = z.object({
  sectionId: z.string().optional().describe('Section ID for a focused Canvas edit'),
  sectionType: z.string().optional().describe('Slack Canvas section type'),
  headingLevel: z.number().optional().describe('Heading level when the section is a heading'),
  text: z.string().optional().describe('Text Slack returned for the matched section')
});

export let lookupCanvasSections = SlateTool.create(spec, {
  name: 'Lookup Canvas Sections',
  key: 'lookup_canvas_sections',
  description:
    'Find section IDs in a known Slack Canvas by section type or contained text so later edits can target a section safely. This does not read the complete Canvas document.',
  instructions: [
    'Use this before edit_canvas when replacing, inserting relative to, or deleting a known section.',
    'Use containsText to locate a section by a distinctive phrase, or sectionTypes to narrow the structural matches.',
    'Pass a returned sectionId to edit_canvas for a focused edit.'
  ],
  constraints: [
    'This tool returns matching section metadata only; it is not a full Canvas reader.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(slackActionScopes.canvasesRead)
  .input(
    z.object({
      canvasId: z.string().trim().min(1).describe('Slack Canvas ID to inspect'),
      sectionTypes: z
        .array(z.string().trim().min(1))
        .min(1)
        .optional()
        .describe('Slack Canvas section types to match'),
      containsText: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Text that matching Canvas sections must contain')
    })
  )
  .output(
    z.object({
      canvasId: z.string().describe('Slack Canvas ID searched'),
      sections: z.array(canvasSectionSchema).describe('Matching Canvas sections'),
      returnedCount: z.number().describe('Number of matching sections returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let sections = await client.lookupCanvasSections({
      canvasId: ctx.input.canvasId,
      sectionTypes: ctx.input.sectionTypes,
      containsText: ctx.input.containsText
    });
    let outputSections = sections.map(section => ({
      sectionId: section.section_id ?? section.id,
      sectionType: section.section_type,
      headingLevel: section.heading_level,
      text: section.text
    }));

    return {
      output: {
        canvasId: ctx.input.canvasId,
        sections: outputSections,
        returnedCount: outputSections.length
      },
      message: `Found ${outputSections.length} matching Canvas section${outputSections.length === 1 ? '' : 's'} in \`${ctx.input.canvasId}\`.`
    };
  })
  .build();

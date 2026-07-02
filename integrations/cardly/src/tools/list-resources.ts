import { SlateTool } from 'slates';
import { z } from 'zod';
import { CardlyClient } from '../lib/client';
import { spec } from '../spec';

export let listResources = SlateTool.create(spec, {
  name: 'List Resources',
  key: 'list_resources',
  description: `Browse available design resources including media types (product sizes like greeting cards, postcards, letters), handwriting fonts, writing styles (messiness levels), and doodles (decorative images). Select which resource types to retrieve.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      includeMedia: z
        .boolean()
        .optional()
        .describe('Include available media/product types with dimensions and credit costs'),
      includeFonts: z.boolean().optional().describe('Include available handwriting fonts'),
      includeWritingStyles: z
        .boolean()
        .optional()
        .describe('Include available writing styles/messiness levels'),
      includeDoodles: z.boolean().optional().describe('Include available decorative doodles'),
      organisationOnly: z
        .boolean()
        .optional()
        .describe(
          'If true, only return resources exclusive to your organisation (applies to fonts and doodles)'
        ),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results per resource type (default 25)')
    })
  )
  .output(
    z.object({
      media: z
        .array(
          z.object({
            mediaId: z.string().describe('Media type ID'),
            name: z.string().describe('Media name (e.g. Standard Greeting Card)'),
            slug: z.string().describe('URL-friendly slug'),
            dimensions: z
              .record(z.string(), z.unknown())
              .optional()
              .describe('Physical dimensions'),
            creditCost: z.number().optional().describe('Credit cost per card')
          })
        )
        .optional()
        .describe('Available media/product types'),
      fonts: z
        .array(
          z.object({
            fontId: z.string().describe('Font ID'),
            name: z.string().describe('Font name'),
            slug: z.string().describe('URL-friendly slug'),
            category: z
              .string()
              .optional()
              .describe('Font category (cursive, hand, serif, etc.)')
          })
        )
        .optional()
        .describe('Available handwriting fonts'),
      writingStyles: z
        .array(
          z.object({
            styleId: z.string().describe('Writing style ID'),
            name: z.string().describe('Style name'),
            slug: z.string().describe('URL-friendly slug')
          })
        )
        .optional()
        .describe('Available writing styles'),
      doodles: z
        .array(
          z.object({
            doodleId: z.string().describe('Doodle ID'),
            name: z.string().describe('Doodle name'),
            slug: z.string().describe('URL-friendly slug'),
            url: z.string().optional().describe('Doodle image URL')
          })
        )
        .optional()
        .describe('Available decorative doodles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CardlyClient({ token: ctx.auth.token });
    let summaryParts: string[] = [];

    let media:
      | Array<{
          mediaId: string;
          name: string;
          slug: string;
          dimensions?: Record<string, unknown>;
          creditCost?: number;
        }>
      | undefined;
    let fonts:
      | Array<{ fontId: string; name: string; slug: string; category?: string }>
      | undefined;
    let writingStyles: Array<{ styleId: string; name: string; slug: string }> | undefined;
    let doodles:
      | Array<{ doodleId: string; name: string; slug: string; url?: string }>
      | undefined;

    if (ctx.input.includeMedia) {
      let result = await client.listMedia({ limit: ctx.input.limit });
      media = result.media.map(m => ({
        mediaId: m.id,
        name: m.name,
        slug: m.slug,
        dimensions: m.dimensions,
        creditCost: m.creditCost
      }));
      summaryParts.push(`**${media.length}** media type(s)`);
    }

    if (ctx.input.includeFonts) {
      let result = await client.listFonts({
        limit: ctx.input.limit,
        organisationOnly: ctx.input.organisationOnly
      });
      fonts = result.fonts.map(f => ({
        fontId: f.id,
        name: f.name,
        slug: f.slug,
        category: f.category
      }));
      summaryParts.push(`**${fonts.length}** font(s)`);
    }

    if (ctx.input.includeWritingStyles) {
      let result = await client.listWritingStyles({ limit: ctx.input.limit });
      writingStyles = result.styles.map(s => ({
        styleId: s.id,
        name: s.name,
        slug: s.slug
      }));
      summaryParts.push(`**${writingStyles.length}** writing style(s)`);
    }

    if (ctx.input.includeDoodles) {
      let result = await client.listDoodles({
        limit: ctx.input.limit,
        organisationOnly: ctx.input.organisationOnly
      });
      doodles = result.doodles.map(d => ({
        doodleId: d.id,
        name: d.name,
        slug: d.slug,
        url: d.url
      }));
      summaryParts.push(`**${doodles.length}** doodle(s)`);
    }

    let summary =
      summaryParts.length > 0
        ? `Found ${summaryParts.join(', ')}.`
        : 'No resource types were selected. Set at least one include flag to true.';

    return {
      output: { media, fonts, writingStyles, doodles },
      message: summary
    };
  })
  .build();

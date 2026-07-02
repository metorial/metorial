import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlidesClient } from '../lib/client';
import { googleSlidesActionScopes } from '../scopes';
import { spec } from '../spec';

let pageElementSchema = z
  .object({
    objectId: z.string().describe('Unique ID of the page element'),
    size: z.any().optional().describe('Size of the element'),
    transform: z.any().optional().describe('Transform applied to the element'),
    shape: z.any().optional().describe('Shape properties if this is a shape'),
    image: z.any().optional().describe('Image properties if this is an image'),
    table: z.any().optional().describe('Table properties if this is a table'),
    sheetsChart: z
      .any()
      .optional()
      .describe('Sheets chart properties if this is a linked chart'),
    elementGroup: z
      .any()
      .optional()
      .describe('Group properties if this is a group of elements')
  })
  .passthrough();

let slideSchema = z
  .object({
    objectId: z.string().describe('Unique ID of the slide'),
    pageElements: z.array(pageElementSchema).optional().describe('Elements on this slide'),
    slideProperties: z
      .any()
      .optional()
      .describe('Slide-specific properties including layout and notes references'),
    pageType: z.string().optional().describe('Type of the page (SLIDE, MASTER, LAYOUT, NOTES)')
  })
  .passthrough();

export let getPresentation = SlateTool.create(spec, {
  name: 'Get Presentation',
  key: 'get_presentation',
  description: `Retrieves the full structure of a Google Slides presentation including all slides, page elements, masters, and layouts. Use this to inspect the presentation's content before making modifications.`,
  instructions: [
    'Use the presentationId from a Google Slides URL: docs.google.com/presentation/d/{presentationId}/edit'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleSlidesActionScopes.getPresentation)
  .input(
    z.object({
      presentationId: z.string().describe('ID of the presentation to retrieve')
    })
  )
  .output(
    z.object({
      presentationId: z.string().describe('Unique ID of the presentation'),
      title: z.string().describe('Title of the presentation'),
      presentationUrl: z.string().describe('URL to open the presentation'),
      slides: z.array(slideSchema).describe('All slides in the presentation'),
      slideCount: z.number().describe('Total number of slides'),
      locale: z.string().optional().describe('Locale of the presentation'),
      masters: z.array(z.any()).optional().describe('Master slides'),
      layouts: z.array(z.any()).optional().describe('Available layouts'),
      pageSize: z.any().optional().describe('Page size dimensions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlidesClient(ctx.auth.token);
    let presentation = await client.getPresentation(ctx.input.presentationId);

    let slides = presentation.slides || [];

    return {
      output: {
        presentationId: presentation.presentationId,
        title: presentation.title,
        presentationUrl: `https://docs.google.com/presentation/d/${presentation.presentationId}/edit`,
        slides,
        slideCount: slides.length,
        locale: presentation.locale,
        masters: presentation.masters,
        layouts: presentation.layouts,
        pageSize: presentation.pageSize
      },
      message: `Retrieved presentation **"${presentation.title}"** with **${slides.length}** slide(s).`
    };
  })
  .build();

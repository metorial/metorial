import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlidesClient } from '../lib/client';
import { googleSlidesActionScopes } from '../scopes';
import { spec } from '../spec';

export let createPresentation = SlateTool.create(spec, {
  name: 'Create Presentation',
  key: 'create_presentation',
  description: `Creates a new blank Google Slides presentation with a given title. Returns the presentation ID, title, and URL that can be used to access or further modify the presentation.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleSlidesActionScopes.createPresentation)
  .input(
    z.object({
      title: z.string().describe('Title for the new presentation')
    })
  )
  .output(
    z.object({
      presentationId: z.string().describe('Unique ID of the created presentation'),
      title: z.string().describe('Title of the created presentation'),
      presentationUrl: z.string().describe('URL to open the presentation in Google Slides'),
      slideCount: z.number().describe('Number of slides in the new presentation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlidesClient(ctx.auth.token);
    let presentation = await client.createPresentation(ctx.input.title);

    return {
      output: {
        presentationId: presentation.presentationId,
        title: presentation.title,
        presentationUrl: `https://docs.google.com/presentation/d/${presentation.presentationId}/edit`,
        slideCount: presentation.slides?.length ?? 0
      },
      message: `Created presentation **"${presentation.title}"** with ID \`${presentation.presentationId}\`.`
    };
  })
  .build();

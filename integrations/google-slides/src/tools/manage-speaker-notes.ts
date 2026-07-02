import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlidesClient } from '../lib/client';
import { googleSlidesActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageSpeakerNotes = SlateTool.create(spec, {
  name: 'Manage Speaker Notes',
  key: 'manage_speaker_notes',
  description: `Read or update the speaker notes for a specific slide. When reading, returns the current notes text. When updating, replaces the entire notes content with the provided text.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleSlidesActionScopes.manageSpeakerNotes)
  .input(
    z.object({
      presentationId: z.string().describe('ID of the presentation'),
      slideObjectId: z.string().describe('Object ID of the slide'),
      action: z
        .enum(['read', 'update'])
        .describe('Whether to read or update the speaker notes'),
      notesText: z
        .string()
        .optional()
        .describe('New speaker notes content (required for update action)')
    })
  )
  .output(
    z.object({
      presentationId: z.string().describe('ID of the presentation'),
      slideObjectId: z.string().describe('Object ID of the slide'),
      notesText: z.string().describe('Current speaker notes text'),
      speakerNotesObjectId: z
        .string()
        .optional()
        .describe('Object ID of the speaker notes element')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlidesClient(ctx.auth.token);
    let { presentationId, slideObjectId, action } = ctx.input;

    let page = await client.getPage(presentationId, slideObjectId);
    let notesPage = page.slideProperties?.notesPage;
    let speakerNotesObjectId = notesPage?.notesProperties?.speakerNotesObjectId;

    if (action === 'update') {
      if (ctx.input.notesText === undefined) {
        throw new Error('notesText is required for update action');
      }
      await client.updateSpeakerNotes(presentationId, slideObjectId, ctx.input.notesText);

      return {
        output: {
          presentationId,
          slideObjectId,
          notesText: ctx.input.notesText,
          speakerNotesObjectId
        },
        message: `Updated speaker notes for slide \`${slideObjectId}\`.`
      };
    }

    // Read action
    let notesText = '';
    if (notesPage?.pageElements) {
      for (let element of notesPage.pageElements) {
        if (element.objectId === speakerNotesObjectId && element.shape?.text?.textElements) {
          for (let te of element.shape.text.textElements) {
            if (te.textRun?.content) {
              notesText += te.textRun.content;
            }
          }
        }
      }
    }

    return {
      output: {
        presentationId,
        slideObjectId,
        notesText: notesText.trim(),
        speakerNotesObjectId
      },
      message: notesText.trim()
        ? `Speaker notes for slide \`${slideObjectId}\`: "${notesText.trim().substring(0, 200)}${notesText.trim().length > 200 ? '...' : ''}"`
        : `Slide \`${slideObjectId}\` has no speaker notes.`
    };
  })
  .build();

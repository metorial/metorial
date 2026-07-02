import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleFormsClient } from '../lib/client';
import { googleFormsActionScopes } from '../scopes';
import { spec } from '../spec';

export let updateForm = SlateTool.create(spec, {
  name: 'Update Form',
  key: 'update_form',
  description: `Updates an existing Google Form using batch update requests. Supports updating form info (title, description), settings (quiz mode), and managing items (adding, updating, moving, or deleting questions, sections, images, and videos).

Accepts an array of update requests that are applied atomically. Each request can be one of: **updateFormInfo**, **updateSettings**, **createItem**, **updateItem**, **moveItem**, or **deleteItem**.`,
  instructions: [
    'Each request in the requests array must contain exactly one operation.',
    'For createItem, provide the full item object and a location with an index.',
    'For updateItem, provide the item with updates, a location pointing to the item index, and an updateMask listing changed fields.',
    'For updateFormInfo, provide the info fields to change and an updateMask.',
    'For updateSettings, provide the settings to change and an updateMask.',
    'To make a form a quiz, use updateSettings with `{ quizSettings: { isQuiz: true } }` and updateMask `"quizSettings.isQuiz"`.'
  ],
  constraints: [
    'You cannot create a form with items in a single call — first create the form, then use this tool to add items.',
    'The requests are processed in order. Item indices may shift as items are added or removed.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleFormsActionScopes.updateForm)
  .input(
    z.object({
      formId: z.string().describe('The ID of the Google Form to update'),
      requests: z
        .array(
          z.object({
            updateFormInfo: z
              .object({
                info: z
                  .object({
                    title: z.string().optional().describe('New title for the form'),
                    description: z.string().optional().describe('New description for the form')
                  })
                  .describe('Form info fields to update'),
                updateMask: z
                  .string()
                  .describe(
                    'Comma-separated field paths to update, e.g. "title", "description", or "title,description"'
                  )
              })
              .optional()
              .describe('Update the form title or description'),
            updateSettings: z
              .object({
                settings: z
                  .object({
                    quizSettings: z
                      .object({
                        isQuiz: z
                          .boolean()
                          .optional()
                          .describe('Whether the form should be a quiz')
                      })
                      .optional()
                      .describe('Quiz-specific settings')
                  })
                  .describe('Settings to update'),
                updateMask: z
                  .string()
                  .describe(
                    'Comma-separated field paths to update, e.g. "quizSettings.isQuiz"'
                  )
              })
              .optional()
              .describe('Update form settings such as quiz mode'),
            createItem: z
              .object({
                item: z
                  .any()
                  .describe(
                    'The item to create. Must include the appropriate kind (questionItem, pageBreakItem, textItem, imageItem, videoItem, questionGroupItem)'
                  ),
                location: z
                  .object({
                    index: z
                      .number()
                      .describe('Zero-based index where the item should be inserted')
                  })
                  .describe('Where to insert the item')
              })
              .optional()
              .describe('Add a new item (question, section, text, image, video) to the form'),
            updateItem: z
              .object({
                item: z.any().describe('The item with updated fields'),
                location: z
                  .object({
                    index: z.number().describe('Zero-based index of the item to update')
                  })
                  .describe('Location of the item to update'),
                updateMask: z.string().describe('Comma-separated field paths to update')
              })
              .optional()
              .describe('Update an existing item on the form'),
            moveItem: z
              .object({
                originalLocation: z
                  .object({
                    index: z.number().describe('Current zero-based index of the item')
                  })
                  .describe('Current location of the item'),
                newLocation: z
                  .object({
                    index: z.number().describe('Destination zero-based index for the item')
                  })
                  .describe('New location for the item')
              })
              .optional()
              .describe('Move an item to a different position'),
            deleteItem: z
              .object({
                location: z
                  .object({
                    index: z.number().describe('Zero-based index of the item to delete')
                  })
                  .describe('Location of the item to delete')
              })
              .optional()
              .describe('Delete an item from the form')
          })
        )
        .describe('Array of update operations to apply'),
      includeFormInResponse: z
        .boolean()
        .optional()
        .describe('If true, the full updated form is returned in the response')
    })
  )
  .output(
    z.object({
      formId: z.string().describe('ID of the updated form'),
      replies: z
        .array(z.any())
        .optional()
        .describe('Replies for each request (e.g., created item IDs)'),
      updatedForm: z
        .any()
        .optional()
        .describe('The full updated form object, if includeFormInResponse was true'),
      revisionId: z.string().optional().describe('New revision ID after the update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleFormsClient(ctx.auth.token);

    let batchRequests = ctx.input.requests.map(req => {
      if (req.updateFormInfo) return { updateFormInfo: req.updateFormInfo };
      if (req.updateSettings) return { updateSettings: req.updateSettings };
      if (req.createItem) return { createItem: req.createItem };
      if (req.updateItem) return { updateItem: req.updateItem };
      if (req.moveItem) return { moveItem: req.moveItem };
      if (req.deleteItem) return { deleteItem: req.deleteItem };
      return {};
    });

    let result = await client.batchUpdate(ctx.input.formId, {
      includeFormInResponse: ctx.input.includeFormInResponse,
      requests: batchRequests
    });

    let operationSummary = ctx.input.requests
      .map(req => {
        if (req.updateFormInfo) return 'updated form info';
        if (req.updateSettings) return 'updated settings';
        if (req.createItem) return 'created item';
        if (req.updateItem) return 'updated item';
        if (req.moveItem) return 'moved item';
        if (req.deleteItem) return 'deleted item';
        return 'unknown operation';
      })
      .join(', ');

    return {
      output: {
        formId: ctx.input.formId,
        replies: result.replies,
        updatedForm: result.form,
        revisionId: result.writeControl?.requiredRevisionId
      },
      message: `Applied ${ctx.input.requests.length} update(s) to form \`${ctx.input.formId}\`: ${operationSummary}.`
    };
  })
  .build();

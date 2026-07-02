import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageForms = SlateTool.create(spec, {
  name: 'Manage Forms',
  key: 'manage_forms',
  description: `List forms and landing pages, or add subscribers to a form. Adding a subscriber to a form may trigger opt-in confirmation depending on form settings.`,
  instructions: [
    'Use action "list" to retrieve all forms. Filter by status or type if needed.',
    'Use action "add_subscriber" to subscribe someone to a form — provide formId and either subscriberId or subscriberEmail.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'add_subscriber']).describe('Action to perform'),
      formId: z.number().optional().describe('Form ID (required for add_subscriber)'),
      subscriberId: z.number().optional().describe('Subscriber ID to add to the form'),
      subscriberEmail: z.string().optional().describe('Subscriber email to add to the form'),
      status: z
        .enum(['active', 'archived', 'trashed', 'all'])
        .optional()
        .describe('Filter forms by status (for list)'),
      type: z.enum(['embed', 'hosted']).optional().describe('Filter forms by type (for list)'),
      perPage: z.number().optional().describe('Results per page'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      forms: z
        .array(
          z.object({
            formId: z.number().describe('Form ID'),
            formName: z.string().describe('Form name'),
            formType: z.string().describe('Form type (embed or hosted)'),
            archived: z.boolean().describe('Whether the form is archived'),
            createdAt: z.string().describe('Creation timestamp'),
            uid: z.string().describe('Form UID')
          })
        )
        .optional()
        .describe('List of forms (for list action)'),
      hasNextPage: z.boolean().optional(),
      nextCursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;

    if (input.action === 'list') {
      let result = await client.listForms({
        status: input.status,
        type: input.type,
        perPage: input.perPage,
        after: input.cursor
      });
      let forms = result.forms.map(f => ({
        formId: f.id,
        formName: f.name,
        formType: f.type,
        archived: f.archived,
        createdAt: f.created_at,
        uid: f.uid
      }));
      return {
        output: {
          forms,
          hasNextPage: result.pagination.has_next_page,
          nextCursor: result.pagination.end_cursor
        },
        message: `Found **${forms.length}** form(s)${result.pagination.has_next_page ? ' (more available)' : ''}.`
      };
    }

    if (input.action === 'add_subscriber') {
      if (!input.formId) throw new Error('formId is required for add_subscriber');
      if (input.subscriberId) {
        await client.addSubscriberToFormById(input.formId, input.subscriberId);
        return {
          output: {},
          message: `Added subscriber #${input.subscriberId} to form #${input.formId}`
        };
      } else if (input.subscriberEmail) {
        await client.addSubscriberToFormByEmail(input.formId, input.subscriberEmail);
        return {
          output: {},
          message: `Added **${input.subscriberEmail}** to form #${input.formId}`
        };
      }
      throw new Error('subscriberId or subscriberEmail is required for add_subscriber');
    }

    throw new Error(`Unknown action: ${input.action}`);
  });

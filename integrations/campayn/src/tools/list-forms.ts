import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listForms = SlateTool.create(spec, {
  name: 'List Web Forms',
  key: 'list_forms',
  description: `Retrieve all web sign-up forms associated with a specific contact list. Optionally filter by form type.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list to retrieve forms for'),
      formType: z
        .enum(['0', '1', '2', '3'])
        .optional()
        .describe(
          'Filter by form type: 0=Signup Page, 1=Embed Signup, 2=WordPress Signup, 3=Facebook Signup'
        )
    })
  )
  .output(
    z.object({
      forms: z.array(
        z.object({
          formId: z.string().describe('Unique identifier for the form'),
          contactListId: z.string().describe('Associated list ID'),
          formTitle: z.string().describe('Form title'),
          formType: z
            .string()
            .describe('Form type code (0=Signup Page, 1=Embed, 2=WordPress, 3=Facebook)'),
          formHtml: z.string().describe('Embedded HTML content for the form'),
          signupCount: z.string().describe('Number of signups through this form')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let forms = await client.getForms(ctx.input.listId, ctx.input.formType);

    let mapped = forms.map(f => ({
      formId: f.id,
      contactListId: f.contact_list_id,
      formTitle: f.form_title,
      formType: f.form_type,
      formHtml: f.form_html,
      signupCount: f.signup_count
    }));

    return {
      output: { forms: mapped },
      message: `Found **${mapped.length}** web form(s) for list ${ctx.input.listId}.`
    };
  })
  .build();

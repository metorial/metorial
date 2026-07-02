import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getForm = SlateTool.create(spec, {
  name: 'Get Web Form',
  key: 'get_form',
  description: `Retrieve details of a specific web sign-up form by ID, including its title, type, HTML content, and signup count.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list the form belongs to'),
      formId: z.string().describe('ID of the form to retrieve')
    })
  )
  .output(
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
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let form = await client.getForm(ctx.input.listId, ctx.input.formId);

    return {
      output: {
        formId: form.id,
        contactListId: form.contact_list_id,
        formTitle: form.form_title,
        formType: form.form_type,
        formHtml: form.form_html,
        signupCount: form.signup_count
      },
      message: `Retrieved web form **${form.form_title}** (${form.signup_count} signups).`
    };
  })
  .build();

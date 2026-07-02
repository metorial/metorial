import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleFormsClient } from '../lib/client';
import { googleFormsActionScopes } from '../scopes';
import { spec } from '../spec';

export let createForm = SlateTool.create(spec, {
  name: 'Create Form',
  key: 'create_form',
  description: `Creates a new Google Form with a title and optional document title. The created form is initially empty — use the **Update Form** tool to add questions, settings, and other content after creation.

Returns the new form's ID, responder URL, and metadata.`,
  instructions: [
    'After creating a form, use the Update Form tool to add questions and configure settings.',
    'The title is the visible form name shown to respondents. The document title is what appears in Google Drive.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleFormsActionScopes.createForm)
  .input(
    z.object({
      title: z.string().describe('The visible title of the form shown to respondents'),
      documentTitle: z
        .string()
        .optional()
        .describe(
          'The title of the form document in Google Drive. If not set, defaults to the form title.'
        )
    })
  )
  .output(
    z.object({
      formId: z.string().describe('Unique identifier of the created form'),
      title: z.string().optional().describe('Title of the form'),
      documentTitle: z.string().optional().describe('Document title in Google Drive'),
      description: z.string().optional().describe('Description of the form'),
      responderUri: z
        .string()
        .optional()
        .describe('URL where respondents can submit the form'),
      revisionId: z.string().optional().describe('Revision ID of the form')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleFormsClient(ctx.auth.token);

    let form = await client.createForm(ctx.input.title, ctx.input.documentTitle);

    return {
      output: {
        formId: form.formId || '',
        title: form.info?.title,
        documentTitle: form.info?.documentTitle,
        description: form.info?.description,
        responderUri: form.responderUri,
        revisionId: form.revisionId
      },
      message: `Created form **"${form.info?.title || ctx.input.title}"** with ID \`${form.formId}\`. Respondents can access it at: ${form.responderUri || 'N/A'}`
    };
  })
  .build();

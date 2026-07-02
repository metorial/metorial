import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listForms = SlateTool.create(spec, {
  name: 'List Forms',
  key: 'list_forms',
  description: `List form endpoints in your Basin account. Supports pagination and search by form name, ID, UUID, or project ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination.'),
      query: z.string().optional().describe('Search by form ID, name, UUID, or project ID.')
    })
  )
  .output(
    z.object({
      forms: z.array(
        z.object({
          formId: z.number().describe('Form ID.'),
          uuid: z.string().describe('Form UUID.'),
          name: z.string().describe('Form name.'),
          enabled: z.boolean().describe('Whether the form is enabled.'),
          endpointUrl: z.string().describe('The unique Basin form endpoint URL.'),
          projectId: z.number().nullable().describe('Associated project ID.'),
          submissionCount: z.number().describe('Total number of submissions.'),
          spamCount: z.number().describe('Total number of spam submissions.'),
          createdAt: z.string().describe('Form creation timestamp.'),
          updatedAt: z.string().describe('Form last updated timestamp.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.listForms({
      page: ctx.input.page,
      query: ctx.input.query
    });

    let items = Array.isArray(data) ? data : (data?.items ?? data?.forms ?? []);

    let forms = items.map((f: any) => ({
      formId: f.id,
      uuid: f.uuid ?? '',
      name: f.name ?? '',
      enabled: f.enabled ?? true,
      endpointUrl: f.endpoint_url ?? '',
      projectId: f.project_id ?? null,
      submissionCount: f.submission_count ?? 0,
      spamCount: f.spam_count ?? 0,
      createdAt: f.created_at ?? '',
      updatedAt: f.updated_at ?? ''
    }));

    return {
      output: { forms },
      message: `Found **${forms.length}** form(s).`
    };
  })
  .build();

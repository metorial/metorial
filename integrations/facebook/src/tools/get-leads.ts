import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { facebookServiceError } from '../lib/errors';
import { spec } from '../spec';

export let getLeads = SlateTool.create(spec, {
  name: 'Get Leads',
  key: 'get_leads',
  description: `Retrieve leads from Facebook Lead Ad forms. Can list available lead forms for a Page, or fetch leads submitted to a specific form.
Requires the \`leads_retrieval\` permission.`,
  instructions: [
    'Use `list_forms` with a `pageId` to discover available lead gen forms.',
    'Use `get_leads` with a `formId` to retrieve submitted leads.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      action: z.enum(['list_forms', 'get_leads']).describe('Operation to perform'),
      pageId: z.string().optional().describe('Page ID (required for list_forms)'),
      formId: z.string().optional().describe('Lead form ID (required for get_leads)'),
      limit: z.number().optional().describe('Maximum leads to return (default: 25)'),
      after: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      forms: z
        .array(
          z.object({
            formId: z.string().describe('Lead form ID'),
            name: z.string().describe('Form name'),
            status: z.string().describe('Form status')
          })
        )
        .optional()
        .describe('Available lead forms'),
      leads: z
        .array(
          z.object({
            leadId: z.string().describe('Lead ID'),
            createdTime: z.string().describe('When the lead was submitted'),
            fields: z
              .array(
                z.object({
                  name: z.string().describe('Field name'),
                  values: z.array(z.string()).describe('Field values')
                })
              )
              .describe('Form field data')
          })
        )
        .optional()
        .describe('Submitted leads'),
      nextCursor: z.string().optional().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    });

    if (ctx.input.action === 'list_forms') {
      if (!ctx.input.pageId) {
        throw facebookServiceError('pageId is required for list_forms action');
      }
      let pageAccessToken = await client.getPageAccessToken(ctx.input.pageId);
      let forms = await client.getLeadForms(ctx.input.pageId, pageAccessToken);
      return {
        output: {
          forms: forms.map(f => ({
            formId: f.id,
            name: f.name,
            status: f.status
          }))
        },
        message: `Found **${forms.length}** lead form(s).`
      };
    }

    // get_leads
    if (!ctx.input.formId) {
      throw facebookServiceError('formId is required for get_leads action');
    }
    let result = await client.getLeads(ctx.input.formId, {
      limit: ctx.input.limit,
      after: ctx.input.after
    });

    return {
      output: {
        leads: result.data.map(l => ({
          leadId: l.id,
          createdTime: l.created_time,
          fields: l.field_data
        })),
        nextCursor: result.paging?.cursors?.after
      },
      message: `Retrieved **${result.data.length}** lead(s).`
    };
  })
  .build();

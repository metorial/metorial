import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newLead = SlateTrigger.create(spec, {
  name: 'New Lead',
  key: 'new_lead',
  description:
    '[Polling fallback] Polls Facebook Lead Ad forms for new lead submissions. Triggers whenever a new lead is collected through a Lead Ad form on a managed Page.'
})
  .input(
    z.object({
      leadId: z.string().describe('Lead ID'),
      createdTime: z.string().describe('When the lead was submitted'),
      formId: z.string().describe('Lead form ID'),
      fields: z
        .array(
          z.object({
            name: z.string().describe('Field name'),
            values: z.array(z.string()).describe('Field values')
          })
        )
        .describe('Form field data submitted by the lead')
    })
  )
  .output(
    z.object({
      leadId: z.string().describe('Lead ID'),
      createdTime: z.string().describe('When the lead was submitted'),
      formId: z.string().describe('Lead form ID'),
      formName: z.string().optional().describe('Lead form name'),
      pageId: z.string().describe('Page ID associated with the lead form'),
      fields: z
        .array(
          z.object({
            name: z.string().describe('Field name'),
            values: z.array(z.string()).describe('Field values')
          })
        )
        .describe('Form field data submitted by the lead')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiVersion: ctx.config.apiVersion
      });

      let state = ctx.state as { knownLeadIds?: string[] } | null;
      let knownLeadIds = new Set<string>(state?.knownLeadIds || []);

      let pages = await client.getMyPages('id,access_token');
      let allInputs: Array<{
        leadId: string;
        createdTime: string;
        formId: string;
        fields: Array<{ name: string; values: string[] }>;
      }> = [];
      let newKnownLeadIds: string[] = [...(state?.knownLeadIds || [])];

      for (let page of pages) {
        if (!page.access_token) continue;

        let forms: Array<{ id: string; name: string; status: string }> = [];
        try {
          forms = await client.getLeadForms(page.id, page.access_token);
        } catch {
          continue;
        }

        for (let form of forms) {
          let result = await client.getLeads(form.id, { limit: 10 });
          for (let lead of result.data) {
            if (state && !knownLeadIds.has(lead.id)) {
              allInputs.push({
                leadId: lead.id,
                createdTime: lead.created_time,
                formId: form.id,
                fields: lead.field_data
              });
            }
            newKnownLeadIds.push(lead.id);
          }
        }
      }

      // Keep the list bounded
      let uniqueIds = [...new Set(newKnownLeadIds)].slice(-1000);

      return {
        inputs: allInputs,
        updatedState: {
          knownLeadIds: uniqueIds
        }
      };
    },

    handleEvent: async ctx => {
      // Try to enrich with form name
      let client = new Client({
        token: ctx.auth.token,
        apiVersion: ctx.config.apiVersion
      });

      let formName: string | undefined;
      let pageId = '';

      try {
        let pages = await client.getMyPages('id,access_token');
        for (let page of pages) {
          if (!page.access_token) continue;
          let forms = await client.getLeadForms(page.id, page.access_token);
          let matchingForm = forms.find(f => f.id === ctx.input.formId);
          if (matchingForm) {
            formName = matchingForm.name;
            pageId = page.id;
            break;
          }
        }
      } catch {
        // Enrichment is best-effort
      }

      return {
        type: 'lead.created',
        id: ctx.input.leadId,
        output: {
          leadId: ctx.input.leadId,
          createdTime: ctx.input.createdTime,
          formId: ctx.input.formId,
          formName,
          pageId,
          fields: ctx.input.fields
        }
      };
    }
  })
  .build();

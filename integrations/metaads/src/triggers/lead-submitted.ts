import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { MetaAdsClient } from '../lib/client';
import { spec } from '../spec';

export let leadSubmitted = SlateTrigger.create(spec, {
  name: 'Lead Submitted',
  key: 'lead_submitted',
  description:
    'Receives webhook notifications when a new lead is submitted through a lead ad form. Configure this webhook in Meta Developer App under Webhooks > Page with the "leadgen" field. The Page must be subscribed via the /{page-id}/subscribed_apps endpoint.'
})
  .input(
    z.object({
      pageId: z.string().describe('Page ID that received the lead'),
      formId: z.string().describe('Lead form ID'),
      leadgenId: z.string().describe('Lead ID'),
      createdTime: z.string().describe('Timestamp of lead submission'),
      adId: z.string().optional().describe('Associated ad ID'),
      adgroupId: z.string().optional().describe('Associated ad group ID')
    })
  )
  .output(
    z.object({
      leadId: z.string().describe('Lead ID'),
      pageId: z.string().describe('Page ID'),
      formId: z.string().describe('Lead form ID'),
      createdTime: z.string().describe('When the lead was submitted'),
      fieldData: z
        .array(
          z.object({
            name: z.string().describe('Field name'),
            values: z.array(z.string()).describe('Submitted values')
          })
        )
        .optional()
        .describe('User-submitted form field data'),
      adId: z.string().optional().describe('Associated ad ID'),
      adName: z.string().optional().describe('Associated ad name'),
      campaignId: z.string().optional().describe('Associated campaign ID'),
      campaignName: z.string().optional().describe('Associated campaign name'),
      isOrganic: z.boolean().optional().describe('Whether the lead is organic')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let method = ctx.request.method;

      // Handle Meta webhook verification challenge
      if (method === 'GET') {
        let url = new URL(ctx.request.url);
        let challenge = url.searchParams.get('hub.challenge');

        if (challenge) {
          return {
            inputs: [],
            response: new Response(challenge, {
              status: 200,
              headers: { 'Content-Type': 'text/plain' }
            })
          };
        }

        return { inputs: [] };
      }

      let body = (await ctx.request.json()) as any;

      if (body.object !== 'page') {
        return { inputs: [] };
      }

      let inputs: Array<{
        pageId: string;
        formId: string;
        leadgenId: string;
        createdTime: string;
        adId?: string;
        adgroupId?: string;
      }> = [];

      for (let entry of body.entry || []) {
        for (let change of entry.changes || []) {
          if (change.field === 'leadgen') {
            let value = change.value || {};
            inputs.push({
              pageId: entry.id || value.page_id || '',
              formId: value.form_id || '',
              leadgenId: value.leadgen_id || '',
              createdTime: value.created_time
                ? String(value.created_time)
                : new Date().toISOString(),
              adId: value.ad_id,
              adgroupId: value.adgroup_id
            });
          }
        }
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      // Fetch full lead data from the API
      let client = new MetaAdsClient({
        token: ctx.auth.token,
        adAccountId: ctx.config.adAccountId,
        apiVersion: ctx.config.apiVersion
      });

      let leadData: any = {};
      try {
        leadData = await client.getLead(ctx.input.leadgenId);
      } catch (e) {
        ctx.warn(
          `Could not fetch full lead data, returning partial data from webhook: ${String(e)}`
        );
      }

      return {
        type: 'lead.submitted',
        id: ctx.input.leadgenId,
        output: {
          leadId: ctx.input.leadgenId,
          pageId: ctx.input.pageId,
          formId: ctx.input.formId,
          createdTime: leadData.created_time || ctx.input.createdTime,
          fieldData: leadData.field_data,
          adId: leadData.ad_id || ctx.input.adId,
          adName: leadData.ad_name,
          campaignId: leadData.campaign_id,
          campaignName: leadData.campaign_name,
          isOrganic: leadData.is_organic
        }
      };
    }
  })
  .build();

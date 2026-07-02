import { SlateTool } from 'slates';
import { z } from 'zod';
import { MetaAdsClient } from '../lib/client';
import { spec } from '../spec';

export let listLeadForms = SlateTool.create(spec, {
  name: 'List Lead Forms',
  key: 'list_lead_forms',
  description: `Retrieve lead generation forms from a Facebook Page. Lead forms are used with lead ad campaigns to capture user information directly on Facebook/Instagram.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageId: z.string().describe('Facebook Page ID to retrieve lead forms from'),
      limit: z.number().optional().describe('Max number of forms to return (default 25)'),
      afterCursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      forms: z.array(
        z.object({
          formId: z.string().describe('Lead form ID'),
          name: z.string().optional().describe('Form name'),
          status: z.string().optional().describe('Form status'),
          createdTime: z.string().optional().describe('Creation timestamp'),
          leadsCount: z.number().optional().describe('Total number of leads'),
          locale: z.string().optional().describe('Form locale')
        })
      ),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetaAdsClient({
      token: ctx.auth.token,
      adAccountId: ctx.config.adAccountId,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.getLeadForms(ctx.input.pageId, {
      limit: ctx.input.limit,
      after: ctx.input.afterCursor
    });

    let forms = (result.data || []).map((f: any) => ({
      formId: f.id,
      name: f.name,
      status: f.status,
      createdTime: f.created_time,
      leadsCount: f.leads_count,
      locale: f.locale
    }));

    return {
      output: {
        forms,
        nextCursor: result.paging?.cursors?.after
      },
      message: `Retrieved **${forms.length}** lead forms from page \`${ctx.input.pageId}\`.`
    };
  })
  .build();

export let getLeads = SlateTool.create(spec, {
  name: 'Get Leads',
  key: 'get_leads',
  description: `Retrieve submitted lead data from a lead generation form. Returns user-submitted field data along with associated ad and campaign information. Requires leads_retrieval permission.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      formId: z.string().describe('Lead form ID to retrieve leads from'),
      limit: z.number().optional().describe('Max number of leads to return (default 25)'),
      afterCursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      leads: z.array(
        z.object({
          leadId: z.string().describe('Lead ID'),
          createdTime: z.string().optional().describe('When the lead was submitted'),
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
          formId: z.string().optional().describe('Source form ID'),
          isOrganic: z
            .boolean()
            .optional()
            .describe('Whether the lead is organic (not from an ad)')
        })
      ),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetaAdsClient({
      token: ctx.auth.token,
      adAccountId: ctx.config.adAccountId,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.getLeads(ctx.input.formId, {
      limit: ctx.input.limit,
      after: ctx.input.afterCursor
    });

    let leads = (result.data || []).map((l: any) => ({
      leadId: l.id,
      createdTime: l.created_time,
      fieldData: l.field_data,
      adId: l.ad_id,
      adName: l.ad_name,
      campaignId: l.campaign_id,
      campaignName: l.campaign_name,
      formId: l.form_id,
      isOrganic: l.is_organic
    }));

    return {
      output: {
        leads,
        nextCursor: result.paging?.cursors?.after
      },
      message: `Retrieved **${leads.length}** leads from form \`${ctx.input.formId}\`.`
    };
  })
  .build();

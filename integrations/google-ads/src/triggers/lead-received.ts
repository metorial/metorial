import { SlateTrigger } from 'slates';
import { googleAdsActionScopes } from '../scopes';
import { spec } from '../spec';
import { leadEventSchema, leadOutputSchema } from './event-schemas';
import { leadForms } from './lead-trigger-group';

export const matchesLeadReceived = (payload: unknown) =>
  leadEventSchema.safeParse(payload).success;

export const leadReceived = SlateTrigger.create(spec, {
  key: 'lead_received',
  name: 'Lead Received',
  description:
    'Triggered when someone submits a Google Ads lead form. Includes lead and campaign IDs, contact fields, and all answer columns. Test leads do not create events.'
})
  .triggerGroup(leadForms)
  .scopes(googleAdsActionScopes.leadFormSubmit)
  .input(leadEventSchema)
  .output(leadOutputSchema)
  .matches(matchesLeadReceived)
  .map(async ctx => {
    const lead = ctx.input;
    const value = (columnId: string) =>
      lead.user_column_data.find(column => column.column_id === columnId)?.string_value;
    return {
      type: 'lead.received',
      id: lead.lead_id,
      output: {
        leadId: lead.lead_id,
        customerId: lead.customerId,
        formId: lead.form_id,
        campaignId: lead.campaign_id,
        adGroupId: lead.adgroup_id,
        creativeId: lead.creative_id,
        assetGroupId: lead.asset_group_id,
        googleClickId: lead.gcl_id,
        submittedAt: lead.lead_submit_time,
        leadStage: lead.lead_stage,
        leadSource: lead.lead_source,
        contact: {
          fullName: value('FULL_NAME'),
          firstName: value('FIRST_NAME'),
          lastName: value('LAST_NAME'),
          email: value('EMAIL'),
          phoneNumber: value('PHONE_NUMBER'),
          companyName: value('COMPANY_NAME'),
          jobTitle: value('JOB_TITLE'),
          workEmail: value('WORK_EMAIL'),
          workPhone: value('WORK_PHONE')
        },
        answers: lead.user_column_data
      }
    };
  })
  .build();

import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { googleAdsActionScopes } from '../scopes';
import { spec } from '../spec';

export let leadFormSubmit = SlateTrigger.create(spec, {
  name: 'Lead Form Submission',
  key: 'lead_form_submit',
  description: `Receives lead form submissions from Google Ads campaigns via webhook. Triggers when a user submits a lead form extension in a Search, Display, YouTube, or Performance Max campaign.

The webhook URL must be configured in the lead form extension settings within Google Ads. Each lead includes the submitted user data, campaign/ad group context, and a Google Click ID.`,
  instructions: [
    'Configure the webhook URL in your Google Ads lead form extension settings.',
    'Use the lead_id for deduplication as Google Ads may retry delivery.',
    'The is_test field indicates whether the lead was submitted using the "Test" button in Google Ads.'
  ]
})
  .scopes(googleAdsActionScopes.leadFormSubmit)
  .input(
    z.object({
      leadId: z.string().describe('Unique lead identifier for deduplication'),
      campaignId: z.string().optional().describe('Campaign that generated the lead'),
      adGroupId: z.string().optional().describe('Ad group that generated the lead'),
      creativeId: z.string().optional().describe('Creative/ad that generated the lead'),
      assetGroupId: z
        .string()
        .optional()
        .describe('Asset group ID (only for Performance Max campaigns)'),
      gclid: z.string().optional().describe('Google Click ID'),
      isTest: z.boolean().optional().describe('Whether this is a test lead'),
      userColumnData: z
        .array(
          z.object({
            columnId: z
              .string()
              .describe(
                'Data type identifier (e.g., FULL_NAME, EMAIL, PHONE_NUMBER, POSTAL_CODE, CITY, COUNTRY)'
              ),
            stringValue: z.string().describe('The submitted value')
          })
        )
        .optional()
        .describe('User-submitted form data'),
      apiVersion: z.string().optional().describe('API version of the webhook payload'),
      formId: z.string().optional().describe('Lead form ID'),
      gclidCreatedAt: z.string().optional().describe('Timestamp when the gclid was created')
    })
  )
  .output(
    z.object({
      leadId: z.string().describe('Unique lead identifier'),
      campaignId: z.string().optional().describe('Campaign ID'),
      adGroupId: z.string().optional().describe('Ad group ID'),
      creativeId: z.string().optional().describe('Creative/ad ID'),
      assetGroupId: z.string().optional().describe('Asset group ID (Performance Max only)'),
      gclid: z.string().optional().describe('Google Click ID for conversion tracking'),
      isTest: z.boolean().optional().describe('Whether this is a test lead'),
      formId: z.string().optional().describe('Lead form ID'),
      userData: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'User-submitted data as key-value pairs (e.g., { "FULL_NAME": "John Doe", "EMAIL": "john@example.com" })'
        )
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let input: {
        leadId: string;
        campaignId?: string;
        adGroupId?: string;
        creativeId?: string;
        assetGroupId?: string;
        gclid?: string;
        isTest?: boolean;
        userColumnData?: { columnId: string; stringValue: string }[];
        apiVersion?: string;
        formId?: string;
        gclidCreatedAt?: string;
      } = {
        leadId: data.lead_id || data.leadId || '',
        campaignId: data.campaign_id?.toString() || data.campaignId?.toString(),
        adGroupId: data.ad_group_id?.toString() || data.adGroupId?.toString(),
        creativeId: data.creative_id?.toString() || data.creativeId?.toString(),
        assetGroupId: data.asset_group_id?.toString() || data.assetGroupId?.toString(),
        gclid: data.gcl_id || data.gclid,
        isTest: data.is_test ?? data.isTest,
        apiVersion: data.api_version || data.apiVersion,
        formId: data.form_id?.toString() || data.formId?.toString(),
        gclidCreatedAt: data.gclid_created_at || data.gclidCreatedAt
      };

      if (Array.isArray(data.user_column_data || data.userColumnData)) {
        input.userColumnData = (data.user_column_data || data.userColumnData).map(
          (col: any) => ({
            columnId: col.column_id || col.columnId,
            stringValue: col.string_value || col.stringValue || ''
          })
        );
      }

      return {
        inputs: [input]
      };
    },

    handleEvent: async ctx => {
      let userData: Record<string, string> = {};
      if (ctx.input.userColumnData) {
        for (let col of ctx.input.userColumnData) {
          userData[col.columnId] = col.stringValue;
        }
      }

      return {
        type: 'lead_form.submitted',
        id: ctx.input.leadId,
        output: {
          leadId: ctx.input.leadId,
          campaignId: ctx.input.campaignId,
          adGroupId: ctx.input.adGroupId,
          creativeId: ctx.input.creativeId,
          assetGroupId: ctx.input.assetGroupId,
          gclid: ctx.input.gclid,
          isTest: ctx.input.isTest,
          formId: ctx.input.formId,
          userData: Object.keys(userData).length > 0 ? userData : undefined
        }
      };
    }
  })
  .build();

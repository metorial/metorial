import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let campaignSettingsSchema = z
  .object({
    dateFrom: z.string().optional().describe('Campaign start date (ISO 8601)'),
    dateTo: z.string().optional().describe('Campaign end date (ISO 8601)'),
    merchantNames: z
      .array(z.string())
      .optional()
      .describe('List of participating merchant names'),
    productLineItems: z
      .array(
        z.object({
          name: z.string().optional().describe('Product name or keyword to match'),
          quantity: z.number().optional().describe('Required quantity'),
          totalPrice: z.number().optional().describe('Expected total price')
        })
      )
      .optional()
      .describe('Eligible product definitions for the campaign'),
    fraudDetection: z
      .boolean()
      .optional()
      .describe('Enable fraud detection for this campaign'),
    productCodes: z.array(z.string()).optional().describe('List of eligible product codes'),
    balanceOwingMin: z.number().optional().describe('Minimum balance/total amount required'),
    balanceOwingMax: z.number().optional().describe('Maximum balance/total amount allowed'),
    smartValidate: z
      .string()
      .optional()
      .describe('Natural language SmartValidate prompt for custom validation logic'),
    skip: z.boolean().optional().describe('Skip certain validation checks'),
    returnFromTheList: z
      .boolean()
      .optional()
      .describe('Return normalized merchant names from the known list')
  })
  .optional();

export let manageCampaign = SlateTool.create(spec, {
  name: 'Manage Campaign',
  key: 'manage_campaign',
  description: `Create, read, update, delete, or list purchase validation campaigns. Campaigns define rules for validating receipts in promotional workflows such as loyalty programs, cashback offers, and warranty programs.

Use **list** to see all campaigns, **get** to retrieve a specific campaign, **create** to set up a new campaign with validation rules, **update** to modify settings, or **delete** to remove a campaign.`,
  instructions: [
    'Campaign IDs should be unique and descriptive (max 50 characters).',
    'Use SmartValidate for complex custom validation scenarios using natural language prompts.',
    'Campaign management requires the validation feature to be enabled on your account.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('The campaign management action to perform'),
      campaignId: z
        .string()
        .optional()
        .describe('Campaign ID (required for get, create, update, delete)'),
      settings: campaignSettingsSchema.describe(
        'Campaign settings (required for create/update)'
      )
    })
  )
  .output(
    z.object({
      campaignIds: z
        .array(z.string())
        .nullable()
        .optional()
        .describe('List of campaign IDs (list action)'),
      campaignId: z.string().nullable().optional().describe('Campaign ID'),
      settings: z.any().nullable().optional().describe('Campaign settings object'),
      deleted: z
        .boolean()
        .nullable()
        .optional()
        .describe('Whether the campaign was deleted (delete action)'),
      error: z.string().nullable().optional().describe('Error message if operation failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, campaignId, settings } = ctx.input;

    if (action !== 'list' && !campaignId) {
      throw new Error('campaignId is required for get, create, update, and delete actions.');
    }

    let output: any = {
      campaignIds: null,
      campaignId: campaignId ?? null,
      settings: null,
      deleted: null,
      error: null
    };

    if (action === 'list') {
      let result = await client.listCampaigns();
      output.campaignIds = result ?? [];
      return {
        output,
        message: `Found **${(output.campaignIds ?? []).length}** campaign(s).`
      };
    }

    if (action === 'get') {
      let result = await client.getCampaign(campaignId!);
      output.settings = result;
      return {
        output,
        message: `Retrieved campaign **${campaignId}**.`
      };
    }

    if (action === 'create') {
      let apiSettings = mapSettingsToApi(settings);
      let result = await client.createCampaign(campaignId!, apiSettings);
      output.settings = result;
      return {
        output,
        message: `Created campaign **${campaignId}**.`
      };
    }

    if (action === 'update') {
      let apiSettings = mapSettingsToApi(settings);
      let result = await client.updateCampaign(campaignId!, apiSettings);
      output.settings = result;
      return {
        output,
        message: `Updated campaign **${campaignId}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteCampaign(campaignId!);
      output.deleted = true;
      return {
        output,
        message: `Deleted campaign **${campaignId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();

let mapSettingsToApi = (settings: any) => {
  if (!settings) return {};

  let apiSettings: Record<string, unknown> = {};

  if (settings.dateFrom || settings.dateTo) {
    apiSettings.date = {
      from: settings.dateFrom,
      to: settings.dateTo
    };
  }
  if (settings.merchantNames) apiSettings.merchantNames = settings.merchantNames;
  if (settings.productLineItems) apiSettings.productLineItems = settings.productLineItems;
  if (settings.fraudDetection !== undefined)
    apiSettings.fraudDetection = settings.fraudDetection;
  if (settings.productCodes) apiSettings.productCodes = settings.productCodes;
  if (settings.balanceOwingMin !== undefined || settings.balanceOwingMax !== undefined) {
    apiSettings.balanceOwing = {
      min: settings.balanceOwingMin,
      max: settings.balanceOwingMax
    };
  }
  if (settings.smartValidate) apiSettings.smartValidate = settings.smartValidate;
  if (settings.skip !== undefined) apiSettings.skip = settings.skip;
  if (settings.returnFromTheList !== undefined)
    apiSettings.returnFromTheList = settings.returnFromTheList;

  return apiSettings;
};

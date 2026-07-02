import { SlateTool } from 'slates';
import { z } from 'zod';
import { type CampaignSettings, Client } from '../lib/client';
import { taggunServiceError } from '../lib/errors';
import { spec } from '../spec';

let campaignSettingsSchema = z
  .object({
    date: z
      .object({
        start: z
          .string()
          .optional()
          .describe('Campaign start date in UTC ISO format, e.g. 2026-06-01T00:00:00.000Z'),
        end: z
          .string()
          .optional()
          .describe('Campaign end date in UTC ISO format, e.g. 2026-06-30T23:59:59.999Z')
      })
      .optional()
      .describe('Optional receipt date window. If supplied, provide both start and end.'),
    merchantNames: z
      .object({
        skip: z.boolean().optional().describe('Skip merchant name validation'),
        returnFromTheList: z
          .boolean()
          .optional()
          .describe('Return the matched merchant name from the supplied list'),
        allowList: z.array(z.string()).optional().describe('Accepted merchant names'),
        blockList: z.array(z.string()).optional().describe('Rejected merchant names'),
        list: z
          .array(z.string())
          .optional()
          .describe('Legacy accepted merchant names. Prefer allowList for new campaigns.')
      })
      .optional()
      .describe('Merchant name validation rules'),
    productCodes: z
      .object({
        skip: z.boolean().optional().describe('Skip product code validation'),
        description: z
          .string()
          .optional()
          .describe('Natural-language instruction for finding relevant product codes'),
        list: z.array(z.string()).optional().describe('Accepted product codes')
      })
      .optional()
      .describe('Product code validation rules'),
    productLineItems: z
      .object({
        skip: z.boolean().optional().describe('Skip product line item validation'),
        names: z.array(z.string()).optional().describe('Product names to match'),
        totalPrice: z
          .object({
            min: z.number().optional().describe('Minimum accepted line item total price'),
            max: z.number().optional().describe('Maximum accepted line item total price')
          })
          .optional()
          .describe('Accepted line item total price range'),
        quantity: z
          .object({
            min: z.number().optional().describe('Minimum accepted line item quantity'),
            max: z.number().optional().describe('Maximum accepted line item quantity')
          })
          .optional()
          .describe('Accepted line item quantity range'),
        shouldMatchAbbreviations: z
          .boolean()
          .optional()
          .describe('Also consider product name abbreviations when matching line items')
      })
      .optional()
      .describe('Product line item validation rules'),
    balanceOwing: z
      .object({
        skip: z.boolean().optional().describe('Skip balance owing validation'),
        min: z.number().optional().describe('Minimum accepted balance owing, if enabled'),
        max: z.number().optional().describe('Maximum accepted balance owing')
      })
      .optional()
      .describe('Balance owing validation rules'),
    fraudDetection: z
      .object({
        skip: z.boolean().optional().describe('Skip fraud validation checks'),
        allowSimilarityCheck: z
          .boolean()
          .optional()
          .describe('Enable duplicate and similarity checks'),
        allowTamperDetection: z.boolean().optional().describe('Enable tamper detection'),
        allowDigitalDetection: z
          .boolean()
          .optional()
          .describe('Enable digital receipt detection'),
        allowHandwritingDetection: z
          .boolean()
          .optional()
          .describe('Enable handwritten receipt detection')
      })
      .optional()
      .describe('Fraud detection validation controls'),
    smartValidate: z
      .object({
        prompts: z
          .array(
            z.object({
              question: z.string().describe('True/false question Taggun should answer'),
              example: z
                .record(z.string(), z.boolean())
                .optional()
                .describe('Expected boolean output key, e.g. { "is_credit_card": true }'),
              skip: z
                .boolean()
                .optional()
                .describe('Skip adding this prompt as a validation check')
            })
          )
          .max(3)
          .optional()
          .describe('One to three Smart Validate prompts')
      })
      .optional()
      .describe('Smart Validate prompt rules')
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
    destructive: true,
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
      result: z
        .string()
        .nullable()
        .optional()
        .describe('Result message for create/update/delete'),
      statusCode: z.number().nullable().optional().describe('Taggun response status code'),
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
      throw taggunServiceError(
        'campaignId is required for get, create, update, and delete actions.'
      );
    }

    if ((action === 'create' || action === 'update') && !settings) {
      throw taggunServiceError('settings are required for create and update actions.');
    }

    let output: any = {
      campaignIds: null,
      campaignId: campaignId ?? null,
      settings: null,
      result: null,
      statusCode: null,
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
      let apiSettings = normalizeSettings(settings);
      let result = await client.createCampaign(campaignId!, apiSettings);
      output.result = result?.result ?? null;
      output.statusCode = result?.statusCode ?? null;
      return {
        output,
        message: `Created campaign **${campaignId}**.`
      };
    }

    if (action === 'update') {
      let apiSettings = normalizeSettings(settings);
      let result = await client.updateCampaign(campaignId!, apiSettings);
      output.result = result?.result ?? null;
      output.statusCode = result?.statusCode ?? null;
      return {
        output,
        message: `Updated campaign **${campaignId}**.`
      };
    }

    if (action === 'delete') {
      let result = await client.deleteCampaign(campaignId!);
      output.deleted = true;
      output.result = result?.result ?? null;
      output.statusCode = result?.statusCode ?? null;
      return {
        output,
        message: `Deleted campaign **${campaignId}**.`
      };
    }

    throw taggunServiceError(`Unknown action: ${action}`);
  })
  .build();

let normalizeSettings = (settings: CampaignSettings | undefined): CampaignSettings => {
  if (!settings) return {};

  if (settings.date && (!settings.date.start || !settings.date.end)) {
    throw taggunServiceError(
      'settings.date.start and settings.date.end are both required when date is provided.'
    );
  }

  if (settings.productLineItems?.totalPrice) {
    let { min, max } = settings.productLineItems.totalPrice;
    if (min === undefined || max === undefined) {
      throw taggunServiceError(
        'settings.productLineItems.totalPrice.min and max are both required when totalPrice is provided.'
      );
    }
  }

  if (settings.productLineItems?.quantity) {
    let { min, max } = settings.productLineItems.quantity;
    if (min === undefined || max === undefined) {
      throw taggunServiceError(
        'settings.productLineItems.quantity.min and max are both required when quantity is provided.'
      );
    }
  }

  for (let prompt of settings.smartValidate?.prompts ?? []) {
    if (!prompt.example || Object.keys(prompt.example).length === 0) {
      throw taggunServiceError(
        'Each settings.smartValidate.prompts item must include a non-empty example object.'
      );
    }
  }

  return settings;
};

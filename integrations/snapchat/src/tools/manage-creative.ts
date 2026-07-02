import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { SnapchatClient } from '../lib/client';
import { snapchatServiceError } from '../lib/errors';
import { spec } from '../spec';

let creativeOutputSchema = z.object({
  creativeId: z.string().describe('Unique ID of the creative'),
  adAccountId: z.string().optional().describe('Parent ad account ID'),
  name: z.string().optional().describe('Creative name'),
  type: z.string().optional().describe('Creative type'),
  headline: z.string().optional().describe('Creative headline'),
  brandName: z.string().optional().describe('Brand name displayed in the creative'),
  shareable: z.boolean().optional().describe('Whether the creative is shareable'),
  callToAction: z.string().optional().describe('Call-to-action button text'),
  topSnapMediaId: z.string().optional().describe('Top snap media ID'),
  topSnapCropPosition: z.string().optional().describe('Crop position for the top snap'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let manageCreative = SlateTool.create(spec, {
  name: 'Manage Creative',
  key: 'manage_creative',
  description: `Create or update a Snapchat ad creative. Creatives define the visual content and call-to-action for ads. Supports Snap Ads, Story Ads, Collection Ads, and more. To create, provide **adAccountId** and creative properties. To update, also provide **creativeId**.`,
  instructions: [
    'Upload media first using Create Media, then reference it via topSnapMediaId.',
    'Creative types: WEB_VIEW, SNAP_AD, APP_INSTALL, COLLECTION, LENS, AD_TO_LENS, STORY, REMOTE_WEBPAGE.'
  ]
})
  .input(
    z.object({
      adAccountId: z.string().describe('Ad account ID the creative belongs to'),
      creativeId: z
        .string()
        .optional()
        .describe('Creative ID to update (omit to create a new creative)'),
      name: z.string().optional().describe('Creative name'),
      type: z
        .string()
        .optional()
        .describe('Creative type (e.g., WEB_VIEW, SNAP_AD, APP_INSTALL)'),
      headline: z.string().optional().describe('Headline text'),
      brandName: z.string().optional().describe('Brand name to display'),
      shareable: z.boolean().optional().describe('Whether the creative is shareable'),
      callToAction: z
        .string()
        .optional()
        .describe('Call-to-action text (e.g., INSTALL_NOW, VIEW_MORE, SIGN_UP)'),
      topSnapMediaId: z.string().optional().describe('Media ID for the top snap'),
      topSnapCropPosition: z.string().optional().describe('Crop position (e.g., MIDDLE)'),
      webViewUrl: z.string().optional().describe('URL for web view creatives'),
      appInstallProperties: z
        .any()
        .optional()
        .describe('App install properties (appName, iosAppId, androidAppUrl, etc.)')
    })
  )
  .output(creativeOutputSchema)
  .handleInvocation(async ctx => {
    let client = new SnapchatClient(ctx.auth.token);
    let { adAccountId, creativeId, ...fields } = ctx.input;

    if (!creativeId) {
      if (!fields.name) throw snapchatServiceError('name is required to create a creative.');
      if (!fields.type) throw snapchatServiceError('type is required to create a creative.');
      if (!fields.brandName) {
        throw snapchatServiceError('brandName is required to create a creative.');
      }
    }

    let creativeData: Record<string, any> = {};
    if (creativeId) creativeData.id = creativeId;
    if (fields.name) creativeData.name = fields.name;
    if (fields.type) creativeData.type = fields.type;
    if (fields.headline) creativeData.headline = fields.headline;
    if (fields.brandName) creativeData.brand_name = fields.brandName;
    if (fields.shareable !== undefined) creativeData.shareable = fields.shareable;
    if (fields.callToAction) creativeData.call_to_action = fields.callToAction;
    if (fields.topSnapMediaId) creativeData.top_snap_media_id = fields.topSnapMediaId;
    if (fields.topSnapCropPosition)
      creativeData.top_snap_crop_position = fields.topSnapCropPosition;
    if (fields.webViewUrl) creativeData.web_view_url = fields.webViewUrl;
    if (fields.appInstallProperties)
      creativeData.app_install_properties = fields.appInstallProperties;

    let result: any;
    if (creativeId) {
      result = await client.updateCreative(adAccountId, creativeData);
    } else {
      result = await client.createCreative(adAccountId, creativeData);
    }

    if (!result) {
      throw snapchatServiceError('Snapchat did not return a creative in the API response.');
    }

    let output = {
      creativeId: result.id,
      adAccountId: result.ad_account_id,
      name: result.name,
      type: result.type,
      headline: result.headline,
      brandName: result.brand_name,
      shareable: result.shareable,
      callToAction: result.call_to_action,
      topSnapMediaId: result.top_snap_media_id,
      topSnapCropPosition: result.top_snap_crop_position,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };

    let action = creativeId ? 'Updated' : 'Created';
    return {
      output,
      message: `${action} creative **${output.name}** (${output.creativeId}).`
    };
  })
  .build();

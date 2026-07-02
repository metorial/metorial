import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { SnapchatClient } from '../lib/client';
import { snapchatServiceError } from '../lib/errors';
import { spec } from '../spec';

let adOutputSchema = z.object({
  adId: z.string().describe('Unique ID of the ad'),
  adSquadId: z.string().optional().describe('Parent ad squad ID'),
  creativeId: z.string().optional().describe('Associated creative ID'),
  name: z.string().optional().describe('Ad name'),
  status: z.string().optional().describe('Ad status'),
  type: z.string().optional().describe('Ad type'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let manageAd = SlateTool.create(spec, {
  name: 'Manage Ad',
  key: 'manage_ad',
  description: `Create or update a Snapchat ad within an ad squad. An ad links a creative to an ad squad for delivery. To create, provide **adSquadId** and properties. To update, also provide **adId**.`,
  instructions: [
    'A creative must be created first and referenced by creativeId.',
    'Valid statuses: ACTIVE, PAUSED.'
  ]
})
  .input(
    z.object({
      adSquadId: z.string().describe('Ad squad ID this ad belongs to'),
      adId: z.string().optional().describe('Ad ID to update (omit to create a new ad)'),
      name: z.string().optional().describe('Ad name'),
      creativeId: z.string().optional().describe('ID of the creative to use'),
      status: z.enum(['ACTIVE', 'PAUSED']).optional().describe('Ad status'),
      type: z.string().optional().describe('Ad type (e.g., SNAP_AD)')
    })
  )
  .output(adOutputSchema)
  .handleInvocation(async ctx => {
    let client = new SnapchatClient(ctx.auth.token);
    let { adSquadId, adId, ...fields } = ctx.input;

    if (!adId) {
      if (!fields.name) throw snapchatServiceError('name is required to create an ad.');
      if (!fields.creativeId) {
        throw snapchatServiceError('creativeId is required to create an ad.');
      }
      if (!fields.status) throw snapchatServiceError('status is required to create an ad.');
      if (!fields.type) throw snapchatServiceError('type is required to create an ad.');
    }

    let adData: Record<string, any> = {};
    if (adId) adData.id = adId;
    if (fields.name) adData.name = fields.name;
    if (fields.creativeId) adData.creative_id = fields.creativeId;
    if (fields.status) adData.status = fields.status;
    if (fields.type) adData.type = fields.type;

    let result: any;
    if (adId) {
      result = await client.updateAd(adSquadId, adData);
    } else {
      result = await client.createAd(adSquadId, adData);
    }

    if (!result) {
      throw snapchatServiceError('Snapchat did not return an ad in the API response.');
    }

    let output = {
      adId: result.id,
      adSquadId: result.ad_squad_id,
      creativeId: result.creative_id,
      name: result.name,
      status: result.status,
      type: result.type,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };

    let action = adId ? 'Updated' : 'Created';
    return {
      output,
      message: `${action} ad **${output.name}** (${output.adId}).`
    };
  })
  .build();

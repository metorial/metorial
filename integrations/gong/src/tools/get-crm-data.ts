import { SlateTool } from 'slates';
import { z } from 'zod';
import { GongClient } from '../lib/client';
import { gongServiceError } from '../lib/errors';
import { spec } from '../spec';

export let getCrmData = SlateTool.create(spec, {
  name: 'Get CRM Data',
  key: 'get_crm_data',
  description: `Retrieve CRM objects uploaded to Gong. Fetch specific CRM entities (accounts, contacts, deals, leads, or users) by their CRM IDs.`,
  instructions: [
    'Provide integrationId, objectType, and objectCrmIds.',
    'objectCrmIds are the record IDs from the source CRM.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      mode: z.enum(['objects']).default('objects').describe('Retrieve CRM objects'),
      integrationId: z.string().describe('CRM integration ID'),
      objectType: z
        .string()
        .describe('CRM object type: Account, Contact, Deal, Lead, or User'),
      objectCrmIds: z.array(z.string()).min(1).describe('CRM IDs of the objects to retrieve')
    })
  )
  .output(
    z.object({
      crmObjects: z
        .record(z.string(), z.any())
        .optional()
        .describe('Map of CRM object IDs to their data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GongClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl
    });

    if (!ctx.input.integrationId || !ctx.input.objectType || !ctx.input.objectCrmIds) {
      throw gongServiceError('integrationId, objectType, and objectCrmIds are required.');
    }

    let result = await client.getCrmObjects({
      integrationId: ctx.input.integrationId,
      objectType: ctx.input.objectType,
      objectCrmIds: ctx.input.objectCrmIds
    });

    return {
      output: {
        crmObjects: result.crmObjectsMap || result.objects
      },
      message: `Retrieved CRM ${ctx.input.objectType} objects.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

let prospectInputSchema = z.object({
  contactName: z.string().describe('Full name of the prospect'),
  contactEmail: z.string().describe('Email address of the prospect'),
  company: z.string().optional().describe('Company name'),
  jobTitle: z.string().optional().describe('Job title'),
  backgroundUrl: z.string().optional().describe('URL for website screenshot personalization'),
  screenshotUrl: z
    .string()
    .optional()
    .describe('Direct screenshot URL for the video background'),
  customField: z.string().optional().describe('Custom personalization value'),
  fields: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Additional personalization fields'),
  webhookUrl: z.string().optional().describe('Webhook URL for this prospect'),
  webhookEvents: z
    .array(z.string())
    .optional()
    .describe('Webhook event names for this prospect')
});

export let addProspectsBulk = SlateTool.create(spec, {
  name: 'Add Prospects in Bulk',
  key: 'add_prospects_bulk',
  description: `Add multiple prospects to a dynamic video campaign at once. This triggers personalized video generation for each prospect in the list.

**Important:** Setting \`processAndAuthorizeCharge\` to \`true\` is implicit and confirms understanding that videos exceeding plan limits may incur charges.`,
  constraints: [
    'Rate limited to 1 request per minute for bulk operations.',
    'All prospects in the batch are processed together.'
  ]
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      callbackId: z
        .string()
        .optional()
        .describe('Callback identifier for this processing request'),
      campaignId: z.string().describe('ID of the dynamic video campaign'),
      prospects: z.array(prospectInputSchema).min(1).describe('List of prospects to add'),
      forceCreation: z
        .boolean()
        .optional()
        .describe('Create new prospects even if they already exist'),
      duplicateStrategy: z
        .enum(['keep-first-valid', 'keep-last-valid'])
        .optional()
        .describe('Strategy for handling duplicate prospects')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Complete provider response'),
      campaignId: z.string().optional(),
      campaignName: z.string().optional(),
      status: z.string().optional(),
      prospects: z.array(
        z.object({
          prospectId: z.string().optional(),
          contactName: z.string().optional(),
          contactEmail: z.string().optional(),
          status: z.string().optional(),
          valid: z.boolean().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.addProspectsBulk(ctx.input.campaignId, {
      processAndAuthorizeCharge: true,
      prospectDepurationConfig:
        ctx.input.forceCreation !== undefined || ctx.input.duplicateStrategy
          ? {
              forceCreation: ctx.input.forceCreation,
              payloadDepurationStrategy: ctx.input.duplicateStrategy
            }
          : undefined,
      prospectList: ctx.input.prospects,
      callbackId: ctx.input.callbackId
    });

    let prospectList = result.prospectList || [];
    let prospects = prospectList.map((p: any) => ({
      prospectId: p._id,
      contactName: p.contactName,
      contactEmail: p.contactEmail,
      status: p.status,
      valid: p.valid
    }));

    return {
      output: {
        campaignId: result._id,
        campaignName: result.name,
        status: result.status,
        prospects,
        raw: result
      },
      message: `Sendspark accepted the bulk prospect request.${result.prospectList ? ` Returned **${prospects.length}** prospect(s).` : ''}`
    };
  })
  .build();

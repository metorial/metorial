import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateLead = SlateTool.create(spec, {
  name: 'Update Lead',
  key: 'update_lead',
  description: `Update an existing lead in the directory. Only one lead can be updated at a time.
Supports updating contact info, categories, and matching members.`,
  constraints: ['Only one lead can be updated at a time.']
})
  .input(
    z.object({
      leadId: z.string().describe('The lead ID to update.'),
      leadName: z.string().optional().describe('Updated name.'),
      leadEmail: z.string().optional().describe('Updated email address.'),
      leadPhone: z.string().optional().describe('Updated phone number.'),
      leadLocation: z.string().optional().describe('Updated location.'),
      leadMessage: z.string().optional().describe('Updated message.'),
      topCategoryName: z.string().optional().describe('Updated top-level category name.'),
      subCategoryName: z.string().optional().describe('Updated sub-category name.'),
      additionalFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Any additional fields as key-value pairs.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      lead: z.any().describe('The updated lead record.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let data: Record<string, any> = {
      lead_id: ctx.input.leadId
    };

    if (ctx.input.leadName) data.lead_name = ctx.input.leadName;
    if (ctx.input.leadEmail) data.lead_email = ctx.input.leadEmail;
    if (ctx.input.leadPhone) data.lead_phone = ctx.input.leadPhone;
    if (ctx.input.leadLocation) data.lead_location = ctx.input.leadLocation;
    if (ctx.input.leadMessage) data.lead_message = ctx.input.leadMessage;
    if (ctx.input.topCategoryName) data.top_category_name = ctx.input.topCategoryName;
    if (ctx.input.subCategoryName) data.sub_category_name = ctx.input.subCategoryName;
    if (ctx.input.additionalFields) {
      for (let [key, value] of Object.entries(ctx.input.additionalFields)) {
        data[key] = value;
      }
    }

    let result = await client.updateLead(data);

    return {
      output: {
        status: result.status,
        lead: result.message
      },
      message: `Updated lead **${ctx.input.leadId}**.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCompany = SlateTool.create(spec, {
  name: 'Update Company',
  key: 'update_company',
  description: `Updates an existing company in SuiteDash CRM. You can update the company name, website, phone, address, tags, and background information. At least one field must be provided.`,
  constraints: ['At least one field must be provided for the update.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      companyUid: z.string().describe('UID of the company to update'),
      companyName: z.string().optional().describe('Updated company name'),
      website: z.string().optional().describe('Updated website URL'),
      phone: z.string().optional().describe('Updated phone number'),
      fullAddress: z.string().optional().describe('Updated full address'),
      tags: z.array(z.string()).optional().describe('Updated tags for the company'),
      backgroundInfo: z
        .string()
        .optional()
        .describe('Updated background information about the company')
    })
  )
  .output(
    z.object({
      company: z.record(z.string(), z.unknown()).describe('The updated company record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      publicId: ctx.auth.publicId,
      secretKey: ctx.auth.secretKey
    });

    let payload: Record<string, unknown> = {};
    if (ctx.input.companyName !== undefined) payload.name = ctx.input.companyName;
    if (ctx.input.website !== undefined) payload.website = ctx.input.website;
    if (ctx.input.phone !== undefined) payload.phone = ctx.input.phone;
    if (ctx.input.fullAddress !== undefined) payload.full_address = ctx.input.fullAddress;
    if (ctx.input.tags !== undefined) payload.tags = ctx.input.tags;
    if (ctx.input.backgroundInfo !== undefined)
      payload.background_info = ctx.input.backgroundInfo;

    if (Object.keys(payload).length === 0) {
      throw new Error('At least one field must be provided to update the company.');
    }

    let result = await client.updateCompany(ctx.input.companyUid, payload);

    return {
      output: { company: result },
      message: `Updated company **${ctx.input.companyUid}**.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { flattenResource } from '../lib/helpers';
import { spec } from '../spec';

export let getProspect = SlateTool.create(spec, {
  name: 'Get Prospect',
  key: 'get_prospect',
  description: `Retrieve a single prospect by ID from Outreach. Returns full contact information, engagement stats, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      prospectId: z.string().describe('ID of the prospect to retrieve')
    })
  )
  .output(
    z.object({
      prospectId: z.string(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().optional(),
      title: z.string().optional(),
      company: z.string().optional(),
      phone: z.string().optional(),
      linkedInUrl: z.string().optional(),
      tags: z.array(z.string()).optional(),
      accountId: z.string().optional(),
      ownerId: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      engagedAt: z.string().optional(),
      openCount: z.number().optional(),
      replyCount: z.number().optional(),
      clickCount: z.number().optional(),
      customFields: z.record(z.string(), z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let resource = await client.getProspect(ctx.input.prospectId);
    let flat = flattenResource(resource);

    let customFields: Record<string, any> = {};
    for (let [key, value] of Object.entries(flat)) {
      if (key.startsWith('custom') && value !== null && value !== undefined) {
        customFields[key] = value;
      }
    }

    return {
      output: {
        prospectId: flat.id,
        firstName: flat.firstName,
        lastName: flat.lastName,
        email: flat.emails?.[0],
        title: flat.title,
        company: flat.company,
        phone: flat.workPhones?.[0],
        linkedInUrl: flat.linkedInUrl,
        tags: flat.tags,
        accountId: flat.accountId,
        ownerId: flat.ownerId,
        createdAt: flat.createdAt,
        updatedAt: flat.updatedAt,
        engagedAt: flat.engagedAt,
        openCount: flat.openCount,
        replyCount: flat.replyCount,
        clickCount: flat.clickCount,
        customFields: Object.keys(customFields).length > 0 ? customFields : undefined
      },
      message: `Retrieved prospect **${flat.firstName ?? ''} ${flat.lastName ?? ''}** (${flat.id}).`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateExhibitor = SlateTool.create(spec, {
  name: 'Update Exhibitor',
  key: 'update_exhibitor',
  description: `Update an existing exhibitor's details. Only provided fields will be updated; omitted fields remain unchanged. Can update name, description, contact info, categories, tags, metadata, social links, and more.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      exhibitorId: z.number().describe('ID of the exhibitor to update'),
      name: z.string().optional().describe('Exhibitor name'),
      description: z.string().optional().describe('Exhibitor description'),
      featured: z.boolean().optional().describe('Whether exhibitor is featured'),
      advertised: z.boolean().optional().describe('Whether exhibitor is advertised'),
      country: z.string().optional().describe('Country'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State/province'),
      zip: z.string().optional().describe('ZIP/postal code'),
      phone1: z.string().optional().describe('Primary phone number'),
      phone2: z.string().optional().describe('Secondary phone number'),
      publicEmail: z.string().optional().describe('Public-facing email'),
      privateEmail: z.string().optional().describe('Private email'),
      website: z.string().optional().describe('Website URL'),
      contactName: z.string().optional().describe('Contact person name'),
      contactPhone: z.string().optional().describe('Contact phone number'),
      adminNotes: z.string().optional().describe('Internal admin notes'),
      externalId: z.string().optional().describe('External ID for integration'),
      categories: z.array(z.number()).optional().describe('Category IDs to assign'),
      tags: z.array(z.string()).optional().describe('Tags to assign'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value metadata'),
      facebookUrl: z.string().optional().describe('Facebook URL'),
      twitterUrl: z.string().optional().describe('Twitter URL'),
      linkedInUrl: z.string().optional().describe('LinkedIn URL'),
      instagramUrl: z.string().optional().describe('Instagram URL'),
      youtubeUrl: z.string().optional().describe('YouTube URL'),
      tiktokUrl: z.string().optional().describe('TikTok URL')
    })
  )
  .output(
    z.object({
      exhibitorId: z.number().describe('ID of the updated exhibitor')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { exhibitorId, ...params } = ctx.input;

    await client.updateExhibitor({
      id: exhibitorId,
      ...params
    });

    return {
      output: {
        exhibitorId
      },
      message: `Updated exhibitor **${exhibitorId}** successfully.`
    };
  })
  .build();

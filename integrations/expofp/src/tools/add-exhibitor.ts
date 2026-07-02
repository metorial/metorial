import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addExhibitor = SlateTool.create(spec, {
  name: 'Add Exhibitor',
  key: 'add_exhibitor',
  description: `Create a new exhibitor for an event. Provide the event ID and exhibitor details such as name, description, contact info, categories, tags, metadata, and social links. Returns the newly created exhibitor's ID.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      eventId: z.number().describe('ID of the event to add the exhibitor to'),
      name: z.string().describe('Exhibitor name'),
      description: z.string().optional().describe('Exhibitor description'),
      featured: z
        .boolean()
        .optional()
        .describe('Whether exhibitor is featured (shown at top of listings)'),
      advertised: z.boolean().optional().describe('Whether exhibitor is advertised'),
      country: z.string().optional().describe('Country'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State/province'),
      zip: z.string().optional().describe('ZIP/postal code'),
      phone1: z.string().optional().describe('Primary phone number'),
      phone2: z.string().optional().describe('Secondary phone number'),
      publicEmail: z.string().optional().describe('Public-facing email'),
      privateEmail: z.string().optional().describe('Private email (not shown publicly)'),
      website: z.string().optional().describe('Website URL'),
      contactName: z.string().optional().describe('Contact person name'),
      contactPhone: z.string().optional().describe('Contact phone number'),
      adminNotes: z.string().optional().describe('Internal admin notes'),
      externalId: z
        .string()
        .optional()
        .describe('External ID for integration with other systems'),
      categories: z.array(z.number()).optional().describe('Category IDs to assign'),
      tags: z.array(z.string()).optional().describe('Tags to assign'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value metadata (max 50 char keys, 256 char values)'),
      facebookUrl: z.string().optional().describe('Facebook profile URL'),
      twitterUrl: z.string().optional().describe('Twitter profile URL'),
      linkedInUrl: z.string().optional().describe('LinkedIn profile URL'),
      instagramUrl: z.string().optional().describe('Instagram profile URL'),
      youtubeUrl: z.string().optional().describe('YouTube channel URL'),
      tiktokUrl: z.string().optional().describe('TikTok profile URL')
    })
  )
  .output(
    z.object({
      exhibitorId: z.number().describe('ID of the newly created exhibitor')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { eventId, ...params } = ctx.input;

    let result = await client.addExhibitor({
      eventId,
      ...params
    });

    return {
      output: {
        exhibitorId: result.id
      },
      message: `Created exhibitor **${ctx.input.name}** with ID **${result.id}**.`
    };
  })
  .build();

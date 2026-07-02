import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getExhibitor = SlateTool.create(spec, {
  name: 'Get Exhibitor',
  key: 'get_exhibitor',
  description: `Retrieve full details of a specific exhibitor by their ID. Returns all exhibitor fields including contact info, description, categories, tags, metadata, social links, and assigned booths.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      exhibitorId: z.number().describe('ID of the exhibitor to retrieve')
    })
  )
  .output(
    z.object({
      exhibitorId: z.number().describe('Exhibitor ID'),
      name: z.string().describe('Exhibitor name'),
      description: z.string().describe('Exhibitor description'),
      featured: z.boolean().describe('Whether exhibitor is featured'),
      advertised: z.boolean().describe('Whether exhibitor is advertised'),
      country: z.string().describe('Country'),
      address: z.string().describe('Address'),
      city: z.string().describe('City'),
      state: z.string().describe('State'),
      zip: z.string().describe('ZIP code'),
      phone1: z.string().describe('Primary phone'),
      phone2: z.string().describe('Secondary phone'),
      publicEmail: z.string().describe('Public email'),
      privateEmail: z.string().describe('Private email'),
      website: z.string().describe('Website URL'),
      contactName: z.string().describe('Contact person name'),
      contactPhone: z.string().describe('Contact phone'),
      adminNotes: z.string().describe('Admin notes'),
      externalId: z.string().describe('External ID'),
      categories: z.array(z.number()).describe('Category IDs'),
      tags: z.array(z.string()).describe('Tags'),
      metadata: z.record(z.string(), z.string()).describe('Custom key-value metadata'),
      boothNames: z.array(z.string()).describe('Assigned booth names'),
      facebookUrl: z.string().describe('Facebook URL'),
      twitterUrl: z.string().describe('Twitter URL'),
      linkedInUrl: z.string().describe('LinkedIn URL'),
      instagramUrl: z.string().describe('Instagram URL'),
      youtubeUrl: z.string().describe('YouTube URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let e = await client.getExhibitor(ctx.input.exhibitorId);

    return {
      output: {
        exhibitorId: e.id,
        name: e.name ?? '',
        description: e.description ?? '',
        featured: e.featured ?? false,
        advertised: e.advertised ?? false,
        country: e.country ?? '',
        address: e.address ?? '',
        city: e.city ?? '',
        state: e.state ?? '',
        zip: e.zip ?? '',
        phone1: e.phone1 ?? '',
        phone2: e.phone2 ?? '',
        publicEmail: e.publicEmail ?? '',
        privateEmail: e.privateEmail ?? '',
        website: e.website ?? '',
        contactName: e.contactName ?? '',
        contactPhone: e.contactPhone ?? '',
        adminNotes: e.adminNotes ?? '',
        externalId: e.externalId ?? '',
        categories: e.categories ?? [],
        tags: e.tags ?? [],
        metadata: e.metadata ?? {},
        boothNames: e.boothNames ?? [],
        facebookUrl: e.facebookUrl ?? '',
        twitterUrl: e.twitterUrl ?? '',
        linkedInUrl: e.linkedInUrl ?? '',
        instagramUrl: e.instagramUrl ?? '',
        youtubeUrl: e.youtubeUrl ?? ''
      },
      message: `Retrieved exhibitor **${e.name}** (ID: ${e.id}).`
    };
  })
  .build();

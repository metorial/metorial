import { SlateTool } from 'slates';
import { z } from 'zod';
import { CultsClient } from '../lib/client';
import { spec } from '../spec';

export let updateCreation = SlateTool.create(spec, {
  name: 'Update Creation',
  key: 'update_creation',
  description: `Update an existing 3D design on Cults3D. Modify any combination of name, description, price, license, tags, meta tags, or AI flag. Only provided fields will be changed.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      creationId: z.string().describe('ID of the creation to update'),
      name: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      downloadPrice: z.number().optional().describe('New download price'),
      currency: z.enum(['USD', 'EUR']).optional().describe('Currency for the price'),
      licenseCode: z.string().optional().describe('New license code'),
      tagNames: z.array(z.string()).optional().describe('New tags (replaces existing)'),
      metaTags: z.array(z.string()).optional().describe('New meta tags (replaces existing)'),
      madeWithAi: z.boolean().optional().describe('Update AI-generated flag')
    })
  )
  .output(
    z.object({
      identifier: z.string().describe('Creation identifier'),
      name: z.string().nullable().describe('Updated name'),
      url: z.string().nullable().describe('Creation URL'),
      shortUrl: z.string().nullable().describe('Short URL'),
      description: z.string().nullable().describe('Updated description'),
      visibility: z.string().nullable().describe('Visibility state'),
      tags: z.array(z.string()).nullable().describe('Current tags'),
      priceUsd: z.number().nullable().describe('Current price in USD')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CultsClient({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let creation = await client.updateCreation({
      creationId: ctx.input.creationId,
      name: ctx.input.name,
      description: ctx.input.description,
      downloadPrice: ctx.input.downloadPrice,
      currency: ctx.input.currency,
      licenseCode: ctx.input.licenseCode,
      tagNames: ctx.input.tagNames,
      metaTags: ctx.input.metaTags,
      madeWithAi: ctx.input.madeWithAi
    });

    return {
      output: {
        identifier: creation.identifier,
        name: creation.name,
        url: creation.url,
        shortUrl: creation.shortUrl,
        description: creation.description,
        visibility: creation.visibility,
        tags: creation.tags,
        priceUsd: creation.price?.value ?? null
      },
      message: `Updated creation **${creation.name ?? ctx.input.creationId}** successfully.`
    };
  })
  .build();

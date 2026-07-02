import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getBrand = SlateTool.create(spec, {
  name: 'Get Brand',
  key: 'get_brand',
  description: `Retrieve details of a specific brand by its ID. Returns full brand configuration including sender defaults, bounce settings, and contact limits.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      brandId: z.string().describe('ID of the brand to retrieve')
    })
  )
  .output(
    z.object({
      brandId: z.string().describe('Brand unique identifier'),
      name: z.string().describe('Brand name'),
      fromName: z.string().describe('Default sender name'),
      fromEmail: z.string().describe('Default sender email'),
      filterSoftBounces: z.boolean().describe('Whether soft-bounced contacts are filtered'),
      maxSoftBounces: z.number().describe('Max soft bounces before marking undeliverable'),
      bounceDangerPercent: z.number().describe('Bounce percentage that triggers auto-pause'),
      unsubscribeText: z.string().describe('Message shown on unsubscribe page'),
      connectionId: z.string().describe('Email connection service ID'),
      contactLimit: z.number().describe('Maximum contacts allowed'),
      url: z.string().describe('Associated website URL'),
      createdAt: z.string().describe('Creation timestamp (ISO 8601)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let b = await client.getBrand(ctx.input.brandId);

    return {
      output: {
        brandId: b.id,
        name: b.name,
        fromName: b.from_name,
        fromEmail: b.from_email,
        filterSoftBounces: b.filter_soft_bounces,
        maxSoftBounces: b.max_soft_bounces,
        bounceDangerPercent: b.bounce_danger_percent,
        unsubscribeText: b.unsubscribe_text,
        connectionId: b.connection_id,
        contactLimit: b.contact_limit,
        url: b.url,
        createdAt: new Date(b.created * 1000).toISOString()
      },
      message: `Retrieved brand **${b.name}** (${b.id}).`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let websiteSchema = z.object({
  websiteId: z.string().describe('Unique website identifier'),
  host: z.string().optional().describe('Website hostname'),
  description: z.string().optional().describe('Website description')
});

let mapWebsite = (w: any) => ({
  websiteId: w.website_id || w.id,
  host: w.host,
  description: w.description
});

export let listWebsites = SlateTool.create(spec, {
  name: 'List Websites',
  key: 'list_websites',
  description: `Retrieve all websites configured in your LiveSession account. Returns website IDs and hostnames, useful for referencing websites in other operations.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      websites: z.array(websiteSchema).describe('List of configured websites')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.listWebsites();
    let websites = (Array.isArray(result) ? result : result.websites || []).map(mapWebsite);

    return {
      output: { websites },
      message: `Found **${websites.length}** websites.`
    };
  })
  .build();

export let createWebsite = SlateTool.create(spec, {
  name: 'Create Website',
  key: 'create_website',
  description: `Add a new website to your LiveSession account for tracking. Each website receives its own tracking ID and can be configured independently.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      host: z.string().describe('Website hostname (e.g. "example.com")'),
      description: z.string().optional().describe('Optional description for the website')
    })
  )
  .output(websiteSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.createWebsite({
      host: ctx.input.host,
      description: ctx.input.description
    });

    let website = mapWebsite(result);
    return {
      output: website,
      message: `Created website **${website.host}** (${website.websiteId}).`
    };
  })
  .build();

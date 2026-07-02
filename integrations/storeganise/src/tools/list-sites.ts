import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSitesTool = SlateTool.create(spec, {
  name: 'List Sites',
  key: 'list_sites',
  description: `Retrieve all storage facility locations configured in your Storeganise account. Returns site details including name, address, and availability state. Use this to get an overview of all locations or search for a specific site.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe('Search query to filter sites by name or other attributes')
    })
  )
  .output(
    z.object({
      sites: z.array(z.record(z.string(), z.any())).describe('List of storage sites')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let sites = await client.listSites({
      search: ctx.input.search
    });

    return {
      output: { sites },
      message: `Retrieved ${sites.length} site(s).`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { domainIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listFolders = SlateTool.create(spec, {
  name: 'List Folders',
  key: 'list_folders',
  description:
    'Discover folders on a domain, including their IDs and settings for organizing links. Call list_domains to discover domain IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      domainId: domainIdSchema
    })
  )
  .output(
    z.object({
      folders: z
        .unknown()
        .describe('Complete folder listing returned by Short.io, including folder IDs.')
    })
  )
  .handleInvocation(async ctx => {
    let folders = await new Client(ctx.auth).listFolders(ctx.input.domainId);
    return {
      output: { folders },
      message: `Retrieved folders for domain **${ctx.input.domainId}**.`
    };
  })
  .build();

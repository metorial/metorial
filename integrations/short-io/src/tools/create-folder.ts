import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { domainIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createFolder = SlateTool.create(spec, {
  name: 'Create Folder',
  key: 'create_folder',
  description:
    'Create a folder to organize links on a domain, with optional QR colors, path prefix, and campaign defaults. Call list_domains to discover domain IDs.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      domainId: domainIdSchema,
      name: z.string().min(1).describe('Folder name.'),
      color: z.string().optional().describe('Folder QR foreground color.'),
      backgroundColor: z.string().optional().describe('Folder QR background color.'),
      prefix: z.string().optional().describe('Default link path prefix.'),
      utmSource: z.string().optional().describe('Default UTM source.'),
      utmMedium: z.string().optional().describe('Default UTM medium.'),
      utmCampaign: z.string().optional().describe('Default UTM campaign.')
    })
  )
  .output(
    z.object({ folder: z.unknown().describe('Complete folder result returned by Short.io.') })
  )
  .handleInvocation(async ctx => {
    let folder = await new Client(ctx.auth).createFolder(ctx.input);
    return { output: { folder }, message: `Created folder **${ctx.input.name}**.` };
  })
  .build();

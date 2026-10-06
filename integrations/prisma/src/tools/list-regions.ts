import { SlateTool } from 'slates';
import { z } from 'zod';
import { PrismaClient } from '../lib/client';
import { regionResponse } from '../lib/schemas';
import { spec } from '../spec';

export const listRegions = SlateTool.create(spec, {
  name: 'List Regions',
  key: 'list_regions',
  description:
    'Discover Prisma Postgres region IDs and availability before provisioning a database.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ regions: z.array(regionResponse) }))
  .handleInvocation(async ctx => {
    const regions = await new PrismaClient(ctx.auth.token).listRegions();
    return {
      output: { regions },
      message: `Found **${regions.length}** Prisma Postgres region(s).`
    };
  })
  .build();

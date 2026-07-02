import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let statusPageSchema = z.object({
  statusPageId: z.number().describe('Unique status page ID'),
  friendlyName: z.string().describe('Display name of the status page'),
  monitors: z.string().describe('Monitor IDs included ("0" means all monitors)'),
  sort: z
    .number()
    .describe('Sort order: 1=name A-Z, 2=name Z-A, 3=status up-down, 4=status down-up'),
  status: z.number().describe('Page status: 0=Paused, 1=Active'),
  standardUrl: z.string().describe('UptimeRobot-hosted URL for the status page'),
  customUrl: z.string().describe('Custom domain URL (empty if not configured)')
});

export let listStatusPages = SlateTool.create(spec, {
  name: 'List Status Pages',
  key: 'list_status_pages',
  description: `Retrieve public status pages from your UptimeRobot account. Status pages display the uptime status of your monitors publicly. Supports filtering by ID and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      statusPageIds: z
        .array(z.number())
        .optional()
        .describe('Filter to specific status page IDs'),
      offset: z.number().optional().describe('Pagination offset (default 0)'),
      limit: z.number().optional().describe('Number of results per page (max 50)')
    })
  )
  .output(
    z.object({
      statusPages: z.array(statusPageSchema),
      total: z.number().describe('Total number of status pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getPSPs({
      psps: ctx.input.statusPageIds?.join('-'),
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let pages = result.statusPages.map((p: any) => ({
      statusPageId: p.id,
      friendlyName: p.friendly_name,
      monitors: String(p.monitors),
      sort: p.sort,
      status: p.status,
      standardUrl: p.standard_url || '',
      customUrl: p.custom_url || ''
    }));

    let total = result.pagination?.total ?? pages.length;

    return {
      output: { statusPages: pages, total },
      message: `Found **${total}** status page(s).`
    };
  })
  .build();

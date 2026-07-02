import { SlateTool } from 'slates';
import { z } from 'zod';
import { AhaClient } from '../lib/client';
import { spec } from '../spec';

export let listReleases = SlateTool.create(spec, {
  name: 'List Releases',
  key: 'list_releases',
  description: `List releases for a given product in Aha!. Returns release names, dates, statuses, and reference numbers. Use this to find a release before creating features within it.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productId: z.string().describe('Product ID or reference prefix'),
      page: z.number().optional().describe('Page number (1-indexed)'),
      perPage: z.number().optional().describe('Records per page (max 200)')
    })
  )
  .output(
    z.object({
      releases: z.array(
        z.object({
          releaseId: z.string().describe('Release ID'),
          referenceNum: z.string().describe('Release reference number'),
          name: z.string().describe('Release name'),
          startDate: z.string().optional().describe('Start date'),
          releaseDate: z.string().optional().describe('Release date'),
          released: z.boolean().optional().describe('Whether the release has shipped'),
          parkingLot: z.boolean().optional().describe('Whether this is a parking lot release'),
          status: z.string().optional().describe('Workflow status name'),
          url: z.string().optional().describe('Aha! URL')
        })
      ),
      totalRecords: z.number().describe('Total number of releases'),
      totalPages: z.number().describe('Total number of pages'),
      currentPage: z.number().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AhaClient(ctx.config.subdomain, ctx.auth.token);

    let result = await client.listReleases(ctx.input.productId, {
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let releases = result.releases.map(r => ({
      releaseId: r.id,
      referenceNum: r.reference_num,
      name: r.name,
      startDate: r.start_date,
      releaseDate: r.release_date,
      released: r.released,
      parkingLot: r.parking_lot,
      status: r.workflow_status?.name,
      url: r.url
    }));

    return {
      output: {
        releases,
        totalRecords: result.pagination.total_records,
        totalPages: result.pagination.total_pages,
        currentPage: result.pagination.current_page
      },
      message: `Found **${result.pagination.total_records}** releases (page ${result.pagination.current_page}/${result.pagination.total_pages}).`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { NasaClient } from '../lib/client';
import { spec } from '../spec';

let tleRecordSchema = z.object({
  satelliteId: z.number().describe('NORAD satellite catalog number'),
  name: z.string().describe('Satellite name'),
  date: z.string().describe('Epoch date of the TLE'),
  line1: z.string().describe('TLE line 1'),
  line2: z.string().describe('TLE line 2')
});

export let searchTle = SlateTool.create(spec, {
  name: 'Search Satellite TLE Data',
  key: 'search_tle',
  description: `Search for Two-Line Element Set (TLE) orbital data for Earth-orbiting satellites. TLEs encode orbital parameters used for tracking satellites. Search by satellite name or look up by NORAD catalog number.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z
        .string()
        .optional()
        .describe('Search term for satellite name (e.g., "ISS", "STARLINK")'),
      satelliteNumber: z
        .number()
        .optional()
        .describe('NORAD catalog number for direct lookup (e.g., 25544 for ISS)'),
      page: z.number().optional().describe('Page number for paginated search results'),
      pageSize: z.number().optional().describe('Number of results per page (default 20)')
    })
  )
  .output(
    z.object({
      totalItems: z.number().optional().describe('Total number of matching satellites'),
      records: z.array(tleRecordSchema).describe('TLE records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NasaClient({ token: ctx.auth.token });

    if (ctx.input.satelliteNumber) {
      let result = await client.getTleByNumber(ctx.input.satelliteNumber);
      let record = {
        satelliteId: result.satelliteId || ctx.input.satelliteNumber,
        name: result.name,
        date: result.date,
        line1: result.line1,
        line2: result.line2
      };
      return {
        output: { totalItems: 1, records: [record] },
        message: `Found TLE data for **${record.name}** (NORAD #${record.satelliteId}).`
      };
    }

    let result = await client.searchTle({
      search: ctx.input.search,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let records = (result.member || []).map((r: any) => ({
      satelliteId: r.satelliteId,
      name: r.name,
      date: r.date,
      line1: r.line1,
      line2: r.line2
    }));

    return {
      output: { totalItems: result.totalItems, records },
      message: `Found **${result.totalItems ?? records.length}** satellites${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}. Returned ${records.length} TLE records.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconstacClient } from '../lib/client';
import { spec } from '../spec';

export let listQrCodes = SlateTool.create(spec, {
  name: 'List QR Codes',
  key: 'list_qr_codes',
  description: `List and search QR codes in your Uniqode account. Supports searching by name, filtering by organization, and sorting by various fields. Returns paginated results with QR code details including their campaign type, URL, and metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Page number for current API pagination'),
      pageSize: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Number of results per page for current API pagination'),
      organizationId: z
        .string()
        .optional()
        .describe('Organization ID from list_organizations; overrides the configured default'),
      search: z.string().optional().describe('Search by QR code name'),
      ordering: z
        .string()
        .optional()
        .describe(
          'Sort results. Use "-updated" for most recent first, "name" for alphabetical, etc.'
        ),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return (default: 10)'),
      offset: z.number().optional().describe('Number of results to skip for pagination')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Complete provider response'),
      totalCount: z.number().describe('Total number of QR codes matching the query'),
      qrCodes: z
        .array(
          z.object({
            qrCodeId: z.number().describe('Unique ID of the QR code'),
            name: z.string().describe('Name of the QR code'),
            qrType: z.number().describe('Type: 1=Static, 2=Dynamic'),
            url: z.string().optional().describe('Short URL for the QR code'),
            campaignContentType: z
              .number()
              .optional()
              .describe('Campaign type: 0=None, 1=URL, 2=Landing Page, 3=Form'),
            placeId: z.number().optional().describe('Associated place ID'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('List of QR codes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BeaconstacClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.listQrCodes({
      search: ctx.input.search,
      ordering: ctx.input.ordering,
      organization: ctx.input.organizationId ?? ctx.config.organizationId,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let qrCodes = result.results.map(qr => ({
      qrCodeId: qr.id,
      name: qr.name,
      qrType: qr.qr_type,
      url: typeof qr.url === 'string' ? qr.url : undefined,
      campaignContentType:
        typeof qr.campaign?.content_type === 'number' ? qr.campaign?.content_type : undefined,
      placeId: typeof qr.place === 'number' ? qr.place : undefined,
      createdAt: typeof qr.created === 'string' ? qr.created : undefined,
      updatedAt: typeof qr.updated === 'string' ? qr.updated : undefined
    }));

    return {
      output: {
        raw: result,
        totalCount: result.count,
        qrCodes
      },
      message: `Found **${result.count}** QR code(s). Showing ${qrCodes.length} result(s).`
    };
  })
  .build();

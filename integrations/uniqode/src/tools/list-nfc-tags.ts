import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconstacClient } from '../lib/client';
import { spec } from '../spec';

export let listNfcTags = SlateTool.create(spec, {
  name: 'List NFC Tags',
  key: 'list_nfc_tags',
  description: `List and search NFC tags in your Uniqode account. Returns tag details including their UID, scan counter, associated campaigns, and state. NFC tags are provisioned through hardware and managed via this API.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z
        .string()
        .optional()
        .describe('Organization ID from list_organizations; overrides the configured default'),
      search: z.string().optional().describe('Search by NFC tag name or place name'),
      ordering: z
        .string()
        .optional()
        .describe(
          'Sort field. Options include: name, place__name, created, updated, state. Prefix with "-" for descending.'
        ),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Complete provider response'),
      totalCount: z.number().describe('Total number of NFC tags'),
      nfcTags: z
        .array(
          z.object({
            nfcTagId: z.number().describe('NFC tag ID'),
            name: z.string().describe('NFC tag name'),
            uid: z.string().optional().describe('Tag UID'),
            counter: z.number().optional().describe('Hardware read counter'),
            url: z.string().optional().describe('Generated NFC URL'),
            state: z.string().optional().describe('Tag state: Active or Sleeping'),
            placeId: z.number().optional().describe('Associated place ID'),
            campaignContentType: z.number().optional().describe('Campaign content type'),
            heartbeat: z.string().optional().describe('Last heartbeat timestamp'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('List of NFC tags')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BeaconstacClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.listNfcTags({
      search: ctx.input.search,
      ordering: ctx.input.ordering,
      organization: ctx.input.organizationId ?? ctx.config.organizationId,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let nfcTags = result.results.map(tag => ({
      nfcTagId: tag.id,
      name: tag.name,
      uid: typeof tag.uid === 'string' ? tag.uid : undefined,
      counter: typeof tag.counter === 'number' ? tag.counter : undefined,
      url: typeof tag.url === 'string' ? tag.url : undefined,
      state: typeof tag.state === 'string' ? tag.state : undefined,
      placeId: typeof tag.place === 'number' ? tag.place : undefined,
      campaignContentType:
        typeof tag.campaign?.content_type === 'number'
          ? tag.campaign?.content_type
          : undefined,
      heartbeat: typeof tag.heartbeat === 'string' ? tag.heartbeat : undefined,
      createdAt: typeof tag.created === 'string' ? tag.created : undefined,
      updatedAt: typeof tag.updated === 'string' ? tag.updated : undefined
    }));

    return {
      output: {
        raw: result,
        totalCount: result.count,
        nfcTags
      },
      message: `Found **${result.count}** NFC tag(s). Showing ${nfcTags.length} result(s).`
    };
  })
  .build();

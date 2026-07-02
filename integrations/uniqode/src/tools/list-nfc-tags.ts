import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconstacClient } from '../lib/client';
import { spec } from '../spec';

export let listNfcTags = SlateTool.create(spec, {
  name: 'List NFC Tags',
  key: 'list_nfc_tags',
  description: `List and search NFC tags in your Beaconstac account. Returns tag details including their UID, scan counter, associated campaigns, and state. NFC tags are provisioned through hardware and managed via this API.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
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
      organization: ctx.config.organizationId,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let nfcTags = result.results.map(tag => ({
      nfcTagId: tag.id,
      name: tag.name,
      uid: tag.uid,
      counter: tag.counter,
      url: tag.url,
      state: tag.state,
      placeId: tag.place,
      campaignContentType: tag.campaign?.content_type,
      heartbeat: tag.heartbeat,
      createdAt: tag.created,
      updatedAt: tag.updated
    }));

    return {
      output: {
        totalCount: result.count,
        nfcTags
      },
      message: `Found **${result.count}** NFC tag(s). Showing ${nfcTags.length} result(s).`
    };
  })
  .build();

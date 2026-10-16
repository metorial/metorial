import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, resourceId } from '../lib/client';
import { spec } from '../spec';

const pageInput = z.object({
  limit: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Maximum number of records in this page. Defaults to 25.'),
  skip: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe('Number of records to skip. Use nextSkip from a previous response.')
});

export let listQuicksendTemplates = SlateTool.create(spec, {
  name: 'List Quicksend Templates',
  key: 'list_quicksend_templates',
  description:
    'Discover your configured Quicksend Templates and their IDs for send_card. Public templates must first be added to your Quicksend Templates in AMcards.',
  tags: { readOnly: true, destructive: false }
})
  .input(pageInput)
  .output(
    z.object({
      templates: z.array(
        z.object({
          templateId: z.string().optional().describe('Quicksend Template ID for send_card.'),
          name: z.string().optional().describe('Template name.')
        })
      ),
      totalCount: z.number().describe('Number of templates returned in this page.'),
      providerTotalCount: z
        .number()
        .optional()
        .describe('Total templates reported by AMcards.'),
      nextSkip: z.number().optional().describe('Offset for the next page, when available.'),
      rawResponse: z.any().describe('Full response from the AMcards API.')
    })
  )
  .handleInvocation(async ctx => {
    let page = await new Client({ token: ctx.auth.token }).listQuicksendTemplates(ctx.input);
    return {
      output: {
        templates: page.items.map(template => ({
          templateId: resourceId(template),
          name: template.name ?? template.title
        })),
        totalCount: page.items.length,
        providerTotalCount: page.providerTotalCount,
        nextSkip: page.nextSkip,
        rawResponse: page.rawResponse
      },
      message: `Retrieved ${page.items.length} Quicksend Template(s).`
    };
  })
  .build();

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Drip Campaigns',
  key: 'list_campaigns',
  description:
    'Discover your configured drip campaigns and their IDs for schedule_drip_campaign. Returns the provider’s campaign settings and personalization requirements.',
  tags: { readOnly: true, destructive: false }
})
  .input(pageInput)
  .output(
    z.object({
      campaigns: z.array(
        z.object({
          campaignId: z
            .string()
            .optional()
            .describe('Campaign ID for schedule_drip_campaign.'),
          name: z.string().optional().describe('Campaign title.'),
          rawResponse: z.any().describe('Complete campaign settings from AMcards.')
        })
      ),
      totalCount: z.number().describe('Number of campaigns returned in this page.'),
      providerTotalCount: z
        .number()
        .optional()
        .describe('Total campaigns reported by AMcards.'),
      nextSkip: z.number().optional().describe('Offset for the next page, when available.'),
      rawResponse: z.any().describe('Full response from the AMcards API.')
    })
  )
  .handleInvocation(async ctx => {
    let page = await new Client({ token: ctx.auth.token }).listCampaigns(ctx.input);
    return {
      output: {
        campaigns: page.items.map(campaign => ({
          campaignId: resourceId(campaign),
          name: typeof campaign.title === 'string' ? campaign.title : undefined,
          rawResponse: campaign
        })),
        totalCount: page.items.length,
        providerTotalCount: page.providerTotalCount,
        nextSkip: page.nextSkip,
        rawResponse: page.rawResponse
      },
      message: `Retrieved ${page.items.length} drip campaign(s).`
    };
  })
  .build();

import { isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { prooflyBoolean, prooflyId, prooflyString } from '../lib/response';
import { spec } from '../spec';

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `List all campaigns in the account. Returns each campaign's ID, name, associated domain, and whether it is currently enabled.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      campaigns: z
        .array(
          z.object({
            campaignId: z.string().describe('Unique campaign identifier'),
            name: z.string().optional().describe('Campaign name'),
            domain: z.string().optional().describe('Domain associated with the campaign'),
            enabled: z
              .boolean()
              .optional()
              .describe('Whether the campaign is currently active'),
            includeSubdomains: z
              .boolean()
              .optional()
              .describe('Whether subdomains are included'),
            createdAt: z.string().optional().describe('Campaign creation timestamp')
          })
        )
        .describe('List of campaigns in the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let campaigns = await client.listCampaigns();

    return {
      output: {
        campaigns: campaigns.map(c => {
          let domain = isApiErrorRecord(c.domain) ? c.domain : {};
          return {
            campaignId: prooflyId(c.id ?? c._id ?? c.campaignId, 'campaign'),
            name: prooflyString(c.name, c.title),
            domain: prooflyString(domain.domain, c.domain, c.website, c.url),
            enabled: prooflyBoolean(c.enabled, c.active, c.is_enabled),
            includeSubdomains: prooflyBoolean(domain.subdomains),
            createdAt: prooflyString(c.created)
          };
        })
      },
      message: `Found **${campaigns.length}** campaign(s).`
    };
  })
  .build();

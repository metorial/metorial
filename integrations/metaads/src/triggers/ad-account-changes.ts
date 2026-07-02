import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let adAccountChanges = SlateTrigger.create(spec, {
  name: 'Ad Account Changes',
  key: 'ad_account_changes',
  description:
    'Receives webhook notifications when campaigns, ad sets, or ads change status (e.g., approved, rejected, delivery issues). Configure this webhook in Meta Developer App settings under Webhooks > Ad Account.'
})
  .input(
    z.object({
      entryId: z.string().describe('Ad account ID from the webhook entry'),
      changeType: z.string().describe('Type of change (e.g., campaigns, adsets, ads)'),
      changeValue: z.record(z.string(), z.any()).describe('Change details from Meta'),
      timestamp: z.string().describe('Timestamp of the change')
    })
  )
  .output(
    z.object({
      adAccountId: z.string().describe('Ad account ID'),
      resourceType: z.string().describe('Type of resource that changed (campaign, adset, ad)'),
      resourceId: z.string().optional().describe('ID of the changed resource'),
      changedFields: z.array(z.string()).optional().describe('List of fields that changed'),
      changeValue: z.record(z.string(), z.any()).optional().describe('Details of the change')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let method = ctx.request.method;

      // Handle Meta webhook verification challenge
      if (method === 'GET') {
        let url = new URL(ctx.request.url);
        let mode = url.searchParams.get('hub.mode');
        let _verifyToken = url.searchParams.get('hub.verify_token');
        let challenge = url.searchParams.get('hub.challenge');

        if (mode === 'subscribe' && challenge) {
          // Return empty inputs - the platform handles the challenge response
          return {
            inputs: [],
            response: new Response(challenge, {
              status: 200,
              headers: { 'Content-Type': 'text/plain' }
            })
          };
        }

        return { inputs: [] };
      }

      // Handle actual webhook events
      let body = (await ctx.request.json()) as any;

      if (body.object !== 'ad_account') {
        return { inputs: [] };
      }

      let inputs: Array<{
        entryId: string;
        changeType: string;
        changeValue: Record<string, any>;
        timestamp: string;
      }> = [];

      for (let entry of body.entry || []) {
        for (let change of entry.changes || []) {
          inputs.push({
            entryId: entry.id || '',
            changeType: change.field || 'unknown',
            changeValue: change.value || {},
            timestamp: entry.time ? String(entry.time) : new Date().toISOString()
          });
        }
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      let resourceType = ctx.input.changeType;
      let resourceId =
        ctx.input.changeValue?.id ||
        ctx.input.changeValue?.campaign_id ||
        ctx.input.changeValue?.adset_id ||
        ctx.input.changeValue?.ad_id;

      return {
        type: `ad_account.${resourceType}`,
        id: `${ctx.input.entryId}-${ctx.input.timestamp}-${resourceType}-${resourceId || 'unknown'}`,
        output: {
          adAccountId: ctx.input.entryId,
          resourceType,
          resourceId: resourceId ? String(resourceId) : undefined,
          changedFields: ctx.input.changeValue?.changed_fields as string[] | undefined,
          changeValue: ctx.input.changeValue
        }
      };
    }
  })
  .build();

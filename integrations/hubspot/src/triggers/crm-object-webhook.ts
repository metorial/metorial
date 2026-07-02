import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { HubSpotClient } from '../lib/client';
import { hubSpotActionScopes } from '../lib/scopes';
import { spec } from '../spec';

function parseSubscription(
  st: string | undefined
): { objectType: string; changeType: 'created' | 'updated' } | null {
  if (!st) return null;
  let parts = st.split('.');
  if (parts.length < 2) return null;
  let objectType = parts[0];
  let tail = parts[1];
  if (!objectType || !tail) return null;
  tail = tail.toLowerCase();
  if (tail === 'creation' || tail === 'create') return { objectType, changeType: 'created' };
  if (
    tail === 'deletion' ||
    tail === 'merge' ||
    tail === 'privacydeletion' ||
    tail === 'restore'
  )
    return null;
  return { objectType, changeType: 'updated' };
}

export let crmObjectWebhook = SlateTrigger.create(spec, {
  name: 'CRM Object Changes (Webhook)',
  key: 'crm_object_webhook',
  description:
    'Receives HubSpot CRM webhooks (legacy subscription payloads) as JSON POST to the Slates webhook URL. Configure the target URL in your HubSpot developer app webhook settings. Parses `subscriptionType` and `objectId`, then loads the object via the CRM API. Complements polling.'
})
  .scopes(hubSpotActionScopes.crmObjectWebhook)
  .input(
    z.object({
      objectType: z
        .string()
        .describe('CRM object type (contacts, companies, deals, tickets, …)'),
      objectId: z.string().describe('HubSpot object ID'),
      changeType: z
        .enum(['created', 'updated'])
        .describe('Whether the object was created or updated')
    })
  )
  .output(
    z.object({
      objectType: z.string().describe('CRM object type'),
      objectId: z.string().describe('HubSpot object ID'),
      changeType: z
        .enum(['created', 'updated'])
        .describe('Whether the object was created or updated'),
      properties: z.record(z.string(), z.any()).describe('Current object properties'),
      modifiedAt: z.string().describe('Timestamp of modification'),
      createdAt: z.string().describe('Timestamp of creation')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let raw: any;
      try {
        raw = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      let list: any[] = Array.isArray(raw)
        ? raw
        : raw.events && Array.isArray(raw.events)
          ? raw.events
          : raw.objectId
            ? [raw]
            : [];

      let inputs: Array<{
        objectType: string;
        objectId: string;
        changeType: 'created' | 'updated';
      }> = [];

      for (let ev of list) {
        let parsed = parseSubscription(ev.subscriptionType ?? ev.subscriptionId);
        if (!parsed) continue;
        let oid = ev.objectId ?? ev.object_id;
        if (oid == null) continue;
        inputs.push({
          objectType: parsed.objectType,
          objectId: String(oid),
          changeType: parsed.changeType
        });
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      let client = new HubSpotClient(ctx.auth.token);
      let row: any;
      try {
        row = await client.getObject(ctx.input.objectType, ctx.input.objectId);
      } catch {
        return {
          type: `${ctx.input.objectType}.${ctx.input.changeType}`,
          id: `${ctx.input.objectType}-${ctx.input.objectId}-webhook`,
          output: {
            objectType: ctx.input.objectType,
            objectId: ctx.input.objectId,
            changeType: ctx.input.changeType,
            properties: {},
            modifiedAt: '',
            createdAt: ''
          }
        };
      }

      let props = row.properties ?? {};
      let modifiedAt =
        props.hs_lastmodifieddate ??
        props.lastmodifieddate ??
        row.updatedAt ??
        new Date().toISOString();
      let createdAt = props.createdate ?? row.createdAt ?? '';

      return {
        type: `${ctx.input.objectType}.${ctx.input.changeType}`,
        id: `${ctx.input.objectType}-${ctx.input.objectId}-${modifiedAt}`,
        output: {
          objectType: ctx.input.objectType,
          objectId: ctx.input.objectId,
          changeType: ctx.input.changeType,
          properties: props,
          modifiedAt: String(modifiedAt),
          createdAt: String(createdAt)
        }
      };
    }
  })
  .build();

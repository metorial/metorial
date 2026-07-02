import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { LookerClient } from '../lib/client';
import { spec } from '../spec';

export let lookActivity = SlateTrigger.create(spec, {
  name: 'Look Changes',
  key: 'look_activity',
  description:
    'Triggers when Looks (saved queries) are created or updated in the Looker instance.'
})
  .input(
    z.object({
      eventType: z.enum(['created', 'updated']).describe('Type of Look event'),
      lookId: z.string().describe('Look ID'),
      title: z.string().optional().describe('Look title'),
      description: z.string().optional().describe('Look description'),
      folderId: z.string().optional().describe('Folder ID'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .output(
    z.object({
      lookId: z.string().describe('Look ID'),
      title: z.string().optional().describe('Look title'),
      description: z.string().optional().describe('Look description'),
      folderId: z.string().optional().describe('Folder ID'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new LookerClient({
        instanceUrl: ctx.config.instanceUrl,
        token: ctx.auth.token
      });

      let state = ctx.state || {};
      let lastPolledAt = state.lastPolledAt as string | undefined;

      let looks = await client.searchLooks({
        sorts: 'updated_at desc',
        per_page: 50
      });

      let inputs: Array<{
        eventType: 'created' | 'updated';
        lookId: string;
        title?: string;
        description?: string;
        folderId?: string;
        updatedAt?: string;
        createdAt?: string;
      }> = [];

      let knownLooks = (state.knownLooks || {}) as Record<string, string>;
      let newKnownLooks: Record<string, string> = {};

      for (let l of looks || []) {
        let id = String(l.id);
        let updatedAt = l.updated_at || l.created_at || '';
        newKnownLooks[id] = updatedAt;

        if (!lastPolledAt) continue;

        let previousUpdatedAt = knownLooks[id];

        if (!previousUpdatedAt) {
          inputs.push({
            eventType: 'created',
            lookId: id,
            title: l.title,
            description: l.description,
            folderId: l.folder_id ? String(l.folder_id) : undefined,
            updatedAt: l.updated_at,
            createdAt: l.created_at
          });
        } else if (updatedAt !== previousUpdatedAt) {
          inputs.push({
            eventType: 'updated',
            lookId: id,
            title: l.title,
            description: l.description,
            folderId: l.folder_id ? String(l.folder_id) : undefined,
            updatedAt: l.updated_at,
            createdAt: l.created_at
          });
        }
      }

      return {
        inputs,
        updatedState: {
          lastPolledAt: new Date().toISOString(),
          knownLooks: newKnownLooks
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `look.${ctx.input.eventType}`,
        id: `look-${ctx.input.lookId}-${ctx.input.updatedAt || ctx.input.createdAt || Date.now()}`,
        output: {
          lookId: ctx.input.lookId,
          title: ctx.input.title,
          description: ctx.input.description,
          folderId: ctx.input.folderId,
          updatedAt: ctx.input.updatedAt,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();

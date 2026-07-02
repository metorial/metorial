import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { ParmaClient } from '../lib/client';
import { spec } from '../spec';

export let newRelationship = SlateTrigger.create(spec, {
  name: 'New Relationship',
  key: 'new_relationship',
  description:
    'Triggers when a new relationship is created in Parma CRM. Polls periodically to detect newly added contacts and relationships.'
})
  .input(
    z.object({
      relationshipId: z.string().describe('ID of the new relationship'),
      name: z.string().describe('Name of the person'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      company: z.string().optional().describe('Company or organization'),
      title: z.string().optional().describe('Job title or role'),
      createdAt: z.string().optional().describe('When the relationship was created')
    })
  )
  .output(
    z.object({
      relationshipId: z.string().describe('Unique ID of the relationship'),
      name: z.string().describe('Name of the person'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      company: z.string().optional().describe('Company or organization'),
      title: z.string().optional().describe('Job title or role'),
      createdAt: z.string().optional().describe('When the relationship was created')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new ParmaClient(ctx.auth.token);
      let state = ctx.state as { knownRelationshipIds?: Record<string, boolean> } | null;
      let knownRelationshipIds = state?.knownRelationshipIds || {};

      let result = await client.listRelationships({ perPage: 100 });
      let items: any[] = Array.isArray(result)
        ? result
        : (result.data ?? result.relationships ?? []);

      let inputs: Array<{
        relationshipId: string;
        name: string;
        email?: string;
        phone?: string;
        company?: string;
        title?: string;
        createdAt?: string;
      }> = [];

      let updatedKnownIds: Record<string, boolean> = {};

      for (let item of items) {
        let id = String(item.id);
        updatedKnownIds[id] = true;

        if (!knownRelationshipIds[id]) {
          // Only emit events after the first poll (skip initial state)
          if (Object.keys(knownRelationshipIds).length > 0) {
            inputs.push({
              relationshipId: id,
              name: item.name,
              email: item.email ?? undefined,
              phone: item.phone ?? undefined,
              company: item.company ?? undefined,
              title: item.title ?? undefined,
              createdAt: item.created_at ?? undefined
            });
          }
        }
      }

      return {
        inputs,
        updatedState: {
          knownRelationshipIds: updatedKnownIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'relationship.created',
        id: `relationship-${ctx.input.relationshipId}-created-${Date.now()}`,
        output: {
          relationshipId: ctx.input.relationshipId,
          name: ctx.input.name,
          email: ctx.input.email,
          phone: ctx.input.phone,
          company: ctx.input.company,
          title: ctx.input.title,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();

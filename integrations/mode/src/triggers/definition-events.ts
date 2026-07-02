import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ModeClient } from '../lib/client';
import { normalizeDefinition } from '../lib/helpers';
import { spec } from '../spec';

export let definitionEvents = SlateTrigger.create(spec, {
  name: 'Definition Events',
  key: 'definition_events',
  description:
    'Triggered when a metric definition is created or updated in the workspace. Configure the webhook in Mode Workspace Settings > Webhooks.'
})
  .input(
    z.object({
      eventName: z.string().describe('The Mode event name'),
      definitionUrl: z.string().optional().describe('API URL to the definition resource'),
      definitionToken: z.string().optional().describe('Extracted definition token')
    })
  )
  .output(
    z.object({
      definitionToken: z.string().describe('Token of the definition'),
      name: z.string().describe('Name of the definition'),
      description: z.string().describe('Description of the definition'),
      createdAt: z.string(),
      updatedAt: z.string()
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventName = body.event || '';

      if (eventName !== 'definition_created' && eventName !== 'definition_updated') {
        return { inputs: [] };
      }

      let definitionUrl = body.definition_url || '';
      let definitionToken = '';

      // Extract token from URL: .../api/{workspace}/definitions/{token}
      if (definitionUrl) {
        let parts = definitionUrl.split('/');
        let defIdx = parts.indexOf('definitions');
        if (defIdx >= 0 && parts.length > defIdx + 1) {
          definitionToken = parts[defIdx + 1];
        }
      }

      return {
        inputs: [
          {
            eventName,
            definitionUrl,
            definitionToken
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventName, definitionToken } = ctx.input;

      if (definitionToken) {
        try {
          let client = new ModeClient({
            token: ctx.auth.token,
            secret: ctx.auth.secret,
            workspaceName: ctx.config.workspaceName
          });
          let raw = await client.getDefinition(definitionToken);
          let definition = normalizeDefinition(raw);
          let type =
            eventName === 'definition_created' ? 'definition.created' : 'definition.updated';
          return {
            type,
            id: `${eventName}_${definitionToken}`,
            output: definition
          };
        } catch {
          // Fall through
        }
      }

      let type =
        eventName === 'definition_created' ? 'definition.created' : 'definition.updated';
      return {
        type,
        id: `${eventName}_${definitionToken || Date.now()}`,
        output: {
          definitionToken: definitionToken || '',
          name: '',
          description: '',
          createdAt: '',
          updatedAt: ''
        }
      };
    }
  })
  .build();

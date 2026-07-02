import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let apiVersionEvent = SlateTrigger.create(spec, {
  name: 'API Version Event',
  key: 'api_version_event',
  description:
    'Triggers when an API version is saved or published in SwaggerHub via a configured webhook integration.'
})
  .input(
    z.object({
      action: z
        .string()
        .describe('The action that triggered the event (e.g., after_api_version_saved)'),
      apiPath: z.string().describe('Full path to the API (owner/api/version)'),
      definition: z.any().optional().describe('The full API definition')
    })
  )
  .output(
    z.object({
      owner: z.string().describe('Owner of the API'),
      apiName: z.string().describe('Name of the API'),
      version: z.string().describe('Version that was affected'),
      action: z.string().describe('The action that was performed'),
      definition: z.any().optional().describe('The full API definition payload')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: Record<string, unknown>;
      try {
        body = (await ctx.request.json()) as Record<string, unknown>;
      } catch {
        return { inputs: [] };
      }

      let action = (body.action as string) || 'unknown';
      let apiPath = (body.apiPath as string) || (body.path as string) || '';
      let definition = body.definition ?? body.payload;

      return {
        inputs: [
          {
            action,
            apiPath,
            definition
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { action, apiPath, definition } = ctx.input;

      // Parse the API path: typically "apis/owner/apiName/version"
      let parts = apiPath.replace(/^\/+/, '').split('/');
      let owner = '';
      let apiName = '';
      let version = '';

      if (parts[0] === 'apis' || parts[0] === 'domains') {
        owner = parts[1] || '';
        apiName = parts[2] || '';
        version = parts[3] || '';
      } else {
        owner = parts[0] || '';
        apiName = parts[1] || '';
        version = parts[2] || '';
      }

      // Determine event type
      let eventType = 'api_version.saved';
      if (action.includes('publish')) {
        eventType = 'api_version.published';
      } else if (action.includes('save')) {
        eventType = 'api_version.saved';
      }

      return {
        type: eventType,
        id: `${apiPath}:${action}:${Date.now()}`,
        output: {
          owner,
          apiName,
          version,
          action,
          definition
        }
      };
    }
  })
  .build();

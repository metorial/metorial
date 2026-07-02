import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient, statusLabel } from '../lib/helpers';
import { spec } from '../spec';

let resourceTypeEnum = z.enum([
  'source',
  'dataset',
  'model',
  'ensemble',
  'deepnet',
  'logisticregression',
  'linearregression',
  'prediction',
  'evaluation',
  'cluster',
  'anomaly',
  'association',
  'topicmodel',
  'timeseries',
  'pca',
  'fusion',
  'optiml',
  'script',
  'execution',
  'project'
]);

let DEFAULT_RESOURCE_TYPES = [
  'source',
  'dataset',
  'model',
  'ensemble',
  'deepnet',
  'prediction',
  'evaluation'
];

export let newResource = SlateTrigger.create(spec, {
  name: 'New Resource',
  key: 'new_resource',
  description:
    'Triggers when a new BigML resource is created. Polls for recently created sources, datasets, models, ensembles, deepnets, predictions, and evaluations.'
})
  .input(
    z.object({
      resourceType: resourceTypeEnum.describe('Type of the new resource'),
      resourceId: z.string().describe('Full resource ID'),
      name: z.string().optional().describe('Name of the resource'),
      statusCode: z.number().optional().describe('Resource status code'),
      statusMessage: z.string().optional().describe('Resource status message'),
      created: z.string().describe('Creation timestamp'),
      tags: z.array(z.string()).optional().describe('Resource tags')
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('Full BigML resource ID'),
      resourceType: z.string().describe('Type of resource (e.g., "source", "model")'),
      name: z.string().optional().describe('Name of the resource'),
      statusCode: z.number().optional().describe('Resource status code'),
      statusLabel: z.string().optional().describe('Human-readable status label'),
      created: z.string().describe('Creation timestamp'),
      tags: z.array(z.string()).optional().describe('Resource tags')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);

      let lastChecked = ctx.state?.lastChecked as string | undefined;
      let now = new Date().toISOString();
      let inputs: Array<{
        resourceType: z.infer<typeof resourceTypeEnum>;
        resourceId: string;
        name?: string;
        statusCode?: number;
        statusMessage?: string;
        created: string;
        tags?: string[];
      }> = [];

      for (let resourceType of DEFAULT_RESOURCE_TYPES) {
        try {
          let filters: Record<string, string> = {};
          if (lastChecked) {
            filters.created__gt = lastChecked;
          }

          let result = await client.listResources(resourceType, {
            limit: 100,
            orderBy: '-created',
            filters
          });

          for (let obj of result.objects) {
            inputs.push({
              resourceType: resourceType as z.infer<typeof resourceTypeEnum>,
              resourceId: obj.resource,
              name: obj.name,
              statusCode: obj.status?.code,
              statusMessage: obj.status?.message,
              created: obj.created,
              tags: obj.tags
            });
          }
        } catch (e) {
          ctx.warn(`Failed to list ${resourceType} resources: ${e}`);
        }
      }

      return {
        inputs,
        updatedState: {
          lastChecked: now
        }
      };
    },

    handleEvent: async ctx => {
      let sLabel =
        ctx.input.statusCode !== undefined ? statusLabel(ctx.input.statusCode) : undefined;

      return {
        type: `${ctx.input.resourceType}.created`,
        id: ctx.input.resourceId,
        output: {
          resourceId: ctx.input.resourceId,
          resourceType: ctx.input.resourceType,
          name: ctx.input.name,
          statusCode: ctx.input.statusCode,
          statusLabel: sLabel,
          created: ctx.input.created,
          tags: ctx.input.tags
        }
      };
    }
  })
  .build();

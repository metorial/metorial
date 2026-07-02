import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient, RESOURCE_STATUS } from '../lib/helpers';
import { spec } from '../spec';

let resourceTypeEnum = z.enum([
  'source',
  'dataset',
  'model',
  'ensemble',
  'deepnet',
  'logisticregression',
  'linearregression',
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
  'execution'
]);

let DEFAULT_RESOURCE_TYPES = ['dataset', 'model', 'ensemble', 'deepnet', 'evaluation'];

export let resourceCompleted = SlateTrigger.create(spec, {
  name: 'Resource Completed',
  key: 'resource_completed',
  description:
    'Triggers when a BigML resource finishes processing (reaches FINISHED status). Polls for recently completed datasets, models, ensembles, deepnets, and evaluations.'
})
  .input(
    z.object({
      resourceType: resourceTypeEnum.describe('Type of the completed resource'),
      resourceId: z.string().describe('Full resource ID'),
      name: z.string().optional().describe('Name of the resource'),
      created: z.string().describe('Creation timestamp'),
      updated: z.string().describe('Last updated timestamp'),
      tags: z.array(z.string()).optional().describe('Resource tags')
    })
  )
  .output(
    z.object({
      resourceId: z.string().describe('Full BigML resource ID'),
      resourceType: z.string().describe('Type of resource'),
      name: z.string().optional().describe('Name of the resource'),
      created: z.string().describe('Creation timestamp'),
      completedAt: z.string().describe('Timestamp when the resource finished processing'),
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
        created: string;
        updated: string;
        tags?: string[];
      }> = [];

      for (let resourceType of DEFAULT_RESOURCE_TYPES) {
        try {
          let filters: Record<string, string> = {
            'status.code': String(RESOURCE_STATUS.FINISHED)
          };
          if (lastChecked) {
            filters.updated__gt = lastChecked;
          }

          let result = await client.listResources(resourceType, {
            limit: 100,
            orderBy: '-updated',
            filters
          });

          for (let obj of result.objects) {
            if (obj.status?.code === RESOURCE_STATUS.FINISHED) {
              inputs.push({
                resourceType: resourceType as z.infer<typeof resourceTypeEnum>,
                resourceId: obj.resource,
                name: obj.name,
                created: obj.created,
                updated: obj.updated,
                tags: obj.tags
              });
            }
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
      return {
        type: `${ctx.input.resourceType}.completed`,
        id: `${ctx.input.resourceId}:completed`,
        output: {
          resourceId: ctx.input.resourceId,
          resourceType: ctx.input.resourceType,
          name: ctx.input.name,
          created: ctx.input.created,
          completedAt: ctx.input.updated,
          tags: ctx.input.tags
        }
      };
    }
  })
  .build();

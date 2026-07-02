import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { resolveMetorialRuntimeConfig } from '../config';
import { MetorialClient } from '../lib/client';
import { metorialValidationError } from '../lib/errors';
import { spec } from '../spec';

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

let instanceRecordSchema = z.record(z.string(), z.unknown());

let extractList = (data: unknown) => {
  if (Array.isArray(data)) {
    return { instances: data, metadata: {} };
  }

  if (!isRecord(data)) {
    throw metorialValidationError('Metorial instances response did not contain a list.');
  }

  for (let key of ['items', 'instances', 'data']) {
    let value = data[key];
    if (Array.isArray(value)) {
      let metadata: Record<string, unknown> = {};
      for (let [metadataKey, metadataValue] of Object.entries(data)) {
        if (metadataKey !== key) metadata[metadataKey] = metadataValue;
      }

      return {
        instances: value,
        metadata
      };
    }
  }

  throw metorialValidationError('Metorial instances response did not contain a list.');
};

export let listInstances = SlateTool.create(spec, {
  name: 'List Instances',
  key: 'list_instances',
  description:
    'List Metorial instances visible to the authenticated actor. This call uses the organization-level instances endpoint and does not send a metorial-instance-id header.',
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      instances: z
        .array(instanceRecordSchema)
        .describe(
          'Metorial instance records, preserving IDs, slugs, names, type, project, and other returned fields.'
        ),
      metadata: z
        .record(z.string(), z.unknown())
        .describe('List response metadata returned alongside the instance items.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetorialClient(resolveMetorialRuntimeConfig(ctx.config, ctx.auth));
    let data = await client.listInstances(ctx.auth.token);
    let output = extractList(data);

    return {
      output,
      message: `Found **${output.instances.length}** Metorial instance(s).`
    };
  })
  .build();

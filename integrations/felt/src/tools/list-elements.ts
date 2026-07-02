import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listElements = SlateTool.create(spec, {
  name: 'List Elements',
  key: 'list_elements',
  description: `Retrieve all annotation elements on a Felt map as a GeoJSON FeatureCollection. Also returns element groups with their associated elements.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      mapId: z.string().describe('ID of the map')
    })
  )
  .output(
    z.object({
      elements: z
        .record(z.string(), z.unknown())
        .describe('GeoJSON FeatureCollection of all elements'),
      elementGroups: z
        .array(
          z.object({
            groupId: z.string().describe('ID of the element group'),
            name: z.string().nullable().describe('Name of the group'),
            color: z.string().nullable().describe('Group color'),
            symbol: z.string().nullable().describe('Group symbol')
          })
        )
        .describe('Element groups on the map')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let [elements, groups] = await Promise.all([
      client.listElements(ctx.input.mapId),
      client.listElementGroups(ctx.input.mapId)
    ]);

    let mappedGroups = (Array.isArray(groups) ? groups : []).map((g: any) => ({
      groupId: g.id,
      name: g.name ?? null,
      color: g.color ?? null,
      symbol: g.symbol ?? null
    }));

    let featureCount = elements?.features?.length ?? 0;

    return {
      output: { elements, elementGroups: mappedGroups },
      message: `Found **${featureCount}** element(s) and **${mappedGroups.length}** element group(s) on map \`${ctx.input.mapId}\`.`
    };
  })
  .build();

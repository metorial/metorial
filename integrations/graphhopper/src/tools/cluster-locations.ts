import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphHopperClient } from '../lib/client';
import { spec } from '../spec';

let customerSchema = z.object({
  customerId: z.string().describe('Unique customer/location identifier'),
  longitude: z.number().describe('Longitude of the customer location'),
  latitude: z.number().describe('Latitude of the customer location'),
  quantity: z.number().optional().describe('Quantity/demand at this location (default 1)')
});

let clusterCenterSchema = z.object({
  centerLongitude: z.number().describe('Longitude of the predefined cluster center'),
  centerLatitude: z.number().describe('Latitude of the predefined cluster center'),
  minQuantity: z.number().optional().describe('Minimum total quantity for this cluster'),
  maxQuantity: z.number().optional().describe('Maximum total quantity for this cluster')
});

let clusterResultSchema = z.object({
  quantity: z.number().describe('Total quantity assigned to this cluster'),
  customerIds: z.array(z.string()).describe('Customer/location IDs assigned to this cluster')
});

export let clusterLocations = SlateTool.create(spec, {
  name: 'Cluster Locations',
  key: 'cluster_locations',
  description: `Group customer locations into clusters based on geographic proximity using road network distances.
Useful for territory planning, field team optimization, or breaking down large routing problems into smaller manageable groups.
Supports capacity constraints (min/max quantity per cluster) and predefined cluster centers.`,
  instructions: [
    'Either specify numClusters to auto-generate clusters, or provide explicit clusterCenters with predefined locations.',
    'When using predefined clusterCenters, the numClusters parameter is ignored.',
    'The quantity field can represent any unit: weight, number of stops, time demand, etc.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      customers: z
        .array(customerSchema)
        .min(1)
        .describe('Customer/location points to cluster'),
      numClusters: z
        .number()
        .optional()
        .describe('Number of clusters to create (auto-generated centers)'),
      minQuantity: z.number().optional().describe('Minimum total quantity per cluster'),
      maxQuantity: z.number().optional().describe('Maximum total quantity per cluster'),
      profile: z
        .enum([
          'car',
          'car_delivery',
          'car_avoid_ferry',
          'car_avoid_motorway',
          'car_avoid_toll',
          'small_truck',
          'small_truck_delivery',
          'truck',
          'scooter',
          'scooter_delivery',
          'foot',
          'hike',
          'bike',
          'mtb',
          'racingbike'
        ])
        .optional()
        .describe('Vehicle profile for distance calculations (default "car")'),
      clusterCenters: z
        .array(clusterCenterSchema)
        .optional()
        .describe('Predefined cluster center points (overrides numClusters)')
    })
  )
  .output(
    z.object({
      clusters: z
        .array(clusterResultSchema)
        .describe('Resulting clusters with assigned customers'),
      processingTimeMs: z
        .number()
        .optional()
        .describe('Server processing time in milliseconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphHopperClient({ token: ctx.auth.token });

    let result = await client.calculateClusters({
      customers: ctx.input.customers,
      numClusters: ctx.input.numClusters,
      minQuantity: ctx.input.minQuantity,
      maxQuantity: ctx.input.maxQuantity,
      profile: ctx.input.profile,
      clusters: ctx.input.clusterCenters
    });

    let clusters = ((result.clusters || []) as Record<string, unknown>[]).map(c => ({
      quantity: c.quantity as number,
      customerIds: c.ids as string[]
    }));

    return {
      output: {
        clusters,
        processingTimeMs: result.processing_time as number | undefined
      },
      message: `Created **${clusters.length}** cluster(s) from **${ctx.input.customers.length}** locations.${clusters.length > 0 ? ` Cluster sizes: ${clusters.map(c => c.customerIds.length).join(', ')} locations.` : ''}`
    };
  })
  .build();

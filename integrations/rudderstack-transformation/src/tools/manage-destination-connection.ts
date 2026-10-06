import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { destinationOutputSchema } from '../lib/models';
import { spec } from '../spec';
export const manageDestinationConnection = SlateTool.create(spec, {
  key: 'manage_destination_connection',
  name: 'Manage Destination Connection',
  description:
    'Connect or disconnect a published transformation and a destination. A destination can have only one transformation: connecting replaces its current association and changes processing of incoming events.',
  instructions: [
    'Discover published transformation IDs and their destination associations with list_transformations. Read existing associations before connecting, and restore them when undoing a change.'
  ],
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z.enum(['connect', 'disconnect']),
      transformationId: z
        .string()
        .describe('Published transformation ID from list_transformations.'),
      destinationId: z
        .string()
        .describe(
          'Destination ID from a known authorized destination or transformation association. Connecting replaces any existing transformation.'
        )
    })
  )
  .output(
    z.object({
      transformationId: z.string(),
      versionId: z.string(),
      name: z.string(),
      destinationId: z.string(),
      action: z.enum(['connect', 'disconnect']),
      destinations: destinationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    const value = await new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    }).manageDestinationConnection(
      ctx.input.transformationId,
      ctx.input.destinationId,
      ctx.input.action
    );
    return {
      output: {
        transformationId: value.id,
        versionId: value.versionId,
        name: value.name,
        destinationId: ctx.input.destinationId,
        action: ctx.input.action,
        destinations: value.destinations
      },
      message: `Destination ${ctx.input.action} request accepted for transformation **${value.name}**. Read associations back to confirm the resulting state.`
    };
  })
  .build();

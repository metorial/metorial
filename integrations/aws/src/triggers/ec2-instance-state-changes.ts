import { DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { clientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let instanceStateInputSchema = z.object({
  instanceId: z.string().describe('EC2 instance ID'),
  previousState: z.string().describe('Previous instance state'),
  currentState: z.string().describe('Current instance state'),
  instanceType: z.string().optional().describe('Instance type'),
  availabilityZone: z.string().optional().describe('Availability zone'),
  timestamp: z.string().describe('When the state change was detected')
});

let instanceStateOutputSchema = z.object({
  instanceId: z.string().describe('EC2 instance ID'),
  previousState: z.string().describe('Previous instance state'),
  currentState: z.string().describe('Current instance state'),
  instanceType: z.string().optional().describe('Instance type'),
  availabilityZone: z.string().optional().describe('Availability zone'),
  timestamp: z.string().describe('When the state change was detected')
});

export let ec2InstanceStateChangesTrigger = SlateTrigger.create(spec, {
  name: 'EC2 Instance State Changes',
  key: 'ec2_instance_state_changes',
  description:
    'Polls for EC2 instance state changes. Detects when instances transition between pending, running, stopping, stopped, shutting-down, and terminated states.'
})
  .input(instanceStateInputSchema)
  .output(instanceStateOutputSchema)
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = clientFromContext(ctx);
      let previousStates: Record<string, string> = (ctx.state as Record<string, string>) ?? {};

      let response = await client.send('EC2 DescribeInstances', () =>
        client.ec2.send(new DescribeInstancesCommand({}))
      );

      let currentInstances = (response.Reservations ?? [])
        .flatMap(reservation => reservation.Instances ?? [])
        .flatMap(instance => {
          if (!instance.InstanceId || !instance.State?.Name) {
            return [];
          }

          return [
            {
              instanceId: instance.InstanceId,
              state: instance.State.Name,
              instanceType: instance.InstanceType,
              availabilityZone: instance.Placement?.AvailabilityZone
            }
          ];
        });

      let inputs: z.infer<typeof instanceStateInputSchema>[] = [];
      let newStates: Record<string, string> = {};
      let now = new Date().toISOString();

      for (let instance of currentInstances) {
        newStates[instance.instanceId] = instance.state;
        let previousState = previousStates[instance.instanceId];

        if (previousState !== undefined && previousState !== instance.state) {
          inputs.push({
            instanceId: instance.instanceId,
            previousState,
            currentState: instance.state,
            instanceType: instance.instanceType,
            availabilityZone: instance.availabilityZone,
            timestamp: now
          });
        }
      }

      return {
        inputs,
        updatedState: newStates
      };
    },

    handleEvent: async ctx => {
      let event = ctx.input;
      let eventType = `instance.${event.currentState}`;

      return {
        type: eventType,
        id: `${event.instanceId}-${event.currentState}-${event.timestamp}`,
        output: {
          instanceId: event.instanceId,
          previousState: event.previousState,
          currentState: event.currentState,
          instanceType: event.instanceType,
          availabilityZone: event.availabilityZone,
          timestamp: event.timestamp
        }
      };
    }
  })
  .build();

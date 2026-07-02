import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { TomTomClient } from '../lib/client';
import { spec } from '../spec';

export let geofenceTransitionTrigger = SlateTrigger.create(spec, {
  name: 'Geofence Transition',
  key: 'geofence_transition',
  description:
    'Triggers when a tracked object enters or exits a geofence boundary. Polls the TomTom Geofencing transitions API for new transition events.'
})
  .input(
    z.object({
      transitionId: z.string().describe('Unique transition identifier'),
      objectId: z.string().describe('ID of the object that crossed the fence'),
      fenceId: z.string().describe('ID of the fence that was crossed'),
      projectId: z.string().optional().describe('ID of the project containing the fence'),
      transitionType: z.string().describe('Type of transition (ENTER or EXIT)'),
      recordedAt: z.string().optional().describe('When the transition was recorded'),
      lat: z.number().optional().describe('Latitude where the transition occurred'),
      lon: z.number().optional().describe('Longitude where the transition occurred')
    })
  )
  .output(
    z.object({
      objectId: z.string().describe('ID of the object that crossed the fence'),
      fenceId: z.string().describe('ID of the fence that was crossed'),
      projectId: z.string().optional().describe('ID of the project containing the fence'),
      transitionType: z.string().describe('Type of transition (ENTER or EXIT)'),
      recordedAt: z.string().optional().describe('When the transition was recorded'),
      lat: z.number().optional().describe('Latitude where the transition occurred'),
      lon: z.number().optional().describe('Longitude where the transition occurred')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new TomTomClient({ token: ctx.auth.token, adminKey: ctx.auth.adminKey });

      let lastTimestamp: string | undefined = ctx.state?.lastTimestamp;
      let knownIds: string[] = ctx.state?.knownIds || [];

      let data = await client.getTransitions({
        objectId: '*',
        limit: 50
      });

      let transitions = data.transitions || [];
      let newTransitions = transitions.filter((t: any) => {
        let tid = t.id || `${t.object}-${t.fence}-${t.timestamp}`;
        return !knownIds.includes(tid);
      });

      let inputs = newTransitions.map((t: any) => {
        let tid = t.id || `${t.object}-${t.fence}-${t.timestamp}`;
        return {
          transitionId: tid,
          objectId: t.object || t.objectId || '',
          fenceId: t.fence || t.fenceId || '',
          projectId: t.project || t.projectId,
          transitionType: t.type || t.transitionType || 'UNKNOWN',
          recordedAt: t.timestamp || t.recordedAt,
          lat: t.position?.latitude || t.lat,
          lon: t.position?.longitude || t.lon
        };
      });

      let allIds = [...knownIds, ...inputs.map((i: any) => i.transitionId)].slice(-200);

      let updatedLastTimestamp =
        inputs.length > 0 && inputs[0]!.recordedAt ? inputs[0]!.recordedAt : lastTimestamp;

      return {
        inputs,
        updatedState: {
          lastTimestamp: updatedLastTimestamp,
          knownIds: allIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `geofence.${ctx.input.transitionType.toLowerCase()}`,
        id: ctx.input.transitionId,
        output: {
          objectId: ctx.input.objectId,
          fenceId: ctx.input.fenceId,
          projectId: ctx.input.projectId,
          transitionType: ctx.input.transitionType,
          recordedAt: ctx.input.recordedAt,
          lat: ctx.input.lat,
          lon: ctx.input.lon
        }
      };
    }
  })
  .build();

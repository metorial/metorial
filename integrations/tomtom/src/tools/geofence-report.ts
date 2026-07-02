import { SlateTool } from 'slates';
import { z } from 'zod';
import { TomTomClient } from '../lib/client';
import { spec } from '../spec';

export let geofenceReport = SlateTool.create(spec, {
  name: 'Geofence Position Report',
  key: 'geofence_position_report',
  description: `Check whether an object at a given position is inside, outside, or near any geofences in a project. Reports the object's relationship with all fences and records a transition if the object has crossed a fence border.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the geofencing project'),
      objectId: z.string().describe('ID of the tracked object'),
      lat: z.number().describe('Current latitude of the object'),
      lon: z.number().describe('Current longitude of the object')
    })
  )
  .output(
    z.object({
      insideFences: z
        .array(
          z.object({
            fenceId: z.string().describe('Fence identifier'),
            fenceName: z.string().optional().describe('Fence name'),
            distanceInMeters: z
              .number()
              .optional()
              .describe('Distance to fence border in meters')
          })
        )
        .describe('Fences the object is inside of'),
      outsideFences: z
        .array(
          z.object({
            fenceId: z.string().describe('Fence identifier'),
            fenceName: z.string().optional().describe('Fence name'),
            distanceInMeters: z
              .number()
              .optional()
              .describe('Distance to fence border in meters')
          })
        )
        .describe('Fences the object is outside of')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient({ token: ctx.auth.token, adminKey: ctx.auth.adminKey });

    let data = await client.reportObjectPosition({
      projectId: ctx.input.projectId,
      objectId: ctx.input.objectId,
      lat: ctx.input.lat,
      lon: ctx.input.lon
    });

    let insideFences: Array<{
      fenceId: string;
      fenceName?: string;
      distanceInMeters?: number;
    }> = [];
    let outsideFences: Array<{
      fenceId: string;
      fenceName?: string;
      distanceInMeters?: number;
    }> = [];

    let fenceResults = data.fences || data.results || [];
    for (let f of fenceResults) {
      let entry = {
        fenceId: f.id || f.fenceId,
        fenceName: f.name,
        distanceInMeters: f.distance?.value || f.distance
      };
      if (f.inside || f.result === 'inside') {
        insideFences.push(entry);
      } else {
        outsideFences.push(entry);
      }
    }

    return {
      output: { insideFences, outsideFences },
      message: `Object \`${ctx.input.objectId}\` is **inside ${insideFences.length}** and **outside ${outsideFences.length}** fence(s).`
    };
  })
  .build();

export let getTransitions = SlateTool.create(spec, {
  name: 'Get Geofence Transitions',
  key: 'get_geofence_transitions',
  description: `Retrieve the history of geofence border crossings (transitions) for a tracked object. Shows when objects entered or exited specific geofences.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      objectId: z.string().describe('ID of the tracked object'),
      projectId: z.string().optional().describe('Filter by project ID'),
      fenceId: z.string().optional().describe('Filter by fence ID'),
      limit: z.number().optional().describe('Maximum number of transitions to return')
    })
  )
  .output(
    z.object({
      transitions: z
        .array(
          z.object({
            transitionId: z.string().optional().describe('Transition identifier'),
            objectId: z.string().describe('Object that crossed the fence'),
            fenceId: z.string().optional().describe('Fence that was crossed'),
            transitionType: z.string().optional().describe('Type of transition (ENTER, EXIT)'),
            recordedAt: z.string().optional().describe('When the transition occurred')
          })
        )
        .describe('Geofence transition history')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient({ token: ctx.auth.token, adminKey: ctx.auth.adminKey });

    let data = await client.getTransitions({
      objectId: ctx.input.objectId,
      projectId: ctx.input.projectId,
      fenceId: ctx.input.fenceId,
      limit: ctx.input.limit
    });

    let transitions = (data.transitions || []).map((t: any) => ({
      transitionId: t.id,
      objectId: t.object || ctx.input.objectId,
      fenceId: t.fence || t.fenceId,
      transitionType: t.type || t.transitionType,
      recordedAt: t.timestamp || t.recordedAt
    }));

    return {
      output: { transitions },
      message: `Found **${transitions.length}** transition(s) for object \`${ctx.input.objectId}\`.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { TomTomClient } from '../lib/client';
import { spec } from '../spec';

export let trafficFlow = SlateTool.create(spec, {
  name: 'Traffic Flow',
  key: 'traffic_flow',
  description: `Get real-time traffic flow data for a road segment near a given location. Returns current speed, free-flow speed, and congestion level for the closest matching road.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      lat: z.number().describe('Latitude of the point on or near the road'),
      lon: z.number().describe('Longitude of the point on or near the road'),
      zoom: z
        .number()
        .min(0)
        .max(22)
        .describe('Zoom level (0-22) - higher values match smaller roads')
    })
  )
  .output(
    z.object({
      currentSpeed: z.number().optional().describe('Current speed in km/h'),
      freeFlowSpeed: z.number().optional().describe('Free-flow (no traffic) speed in km/h'),
      currentTravelTime: z.number().optional().describe('Current travel time in seconds'),
      freeFlowTravelTime: z.number().optional().describe('Free-flow travel time in seconds'),
      confidence: z.number().optional().describe('Confidence of the data (0-1)'),
      roadClosure: z.boolean().optional().describe('Whether the road is closed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient({ token: ctx.auth.token, adminKey: ctx.auth.adminKey });

    let data = await client.getTrafficFlowSegment({
      lat: ctx.input.lat,
      lon: ctx.input.lon,
      zoom: ctx.input.zoom
    });

    let flow = data.flowSegmentData || {};

    return {
      output: {
        currentSpeed: flow.currentSpeed,
        freeFlowSpeed: flow.freeFlowSpeed,
        currentTravelTime: flow.currentTravelTime,
        freeFlowTravelTime: flow.freeFlowTravelTime,
        confidence: flow.confidence,
        roadClosure: flow.roadClosure
      },
      message: `Traffic flow at (${ctx.input.lat}, ${ctx.input.lon}): **${flow.currentSpeed || 'N/A'} km/h** (free flow: ${flow.freeFlowSpeed || 'N/A'} km/h).`
    };
  })
  .build();

export let trafficIncidents = SlateTool.create(spec, {
  name: 'Traffic Incidents',
  key: 'traffic_incidents',
  description: `Retrieve real-time traffic incidents within a bounding box area. Returns details about jams, road closures, construction, and other traffic-related events including location, severity, and road information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      minLat: z.number().describe('Bounding box minimum latitude (south)'),
      minLon: z.number().describe('Bounding box minimum longitude (west)'),
      maxLat: z.number().describe('Bounding box maximum latitude (north)'),
      maxLon: z.number().describe('Bounding box maximum longitude (east)'),
      language: z.string().optional().describe('Language for incident descriptions (IETF tag)')
    })
  )
  .output(
    z.object({
      incidents: z
        .array(
          z.object({
            incidentId: z.string().optional().describe('Unique incident identifier'),
            incidentType: z.string().optional().describe('Type of incident'),
            severity: z.number().optional().describe('Severity icon category (0-13)'),
            magnitudeOfDelay: z
              .number()
              .optional()
              .describe(
                'Magnitude of delay (0=unknown, 1=minor, 2=moderate, 3=major, 4=undefined)'
              ),
            from: z.string().optional().describe('Start location description'),
            to: z.string().optional().describe('End location description'),
            lengthInMeters: z.number().optional().describe('Length of the incident in meters'),
            delayInSeconds: z
              .number()
              .optional()
              .describe('Delay caused by incident in seconds'),
            roadNumbers: z.array(z.string()).optional().describe('Affected road numbers'),
            startTime: z.string().optional().describe('Incident start time'),
            endTime: z.string().optional().describe('Incident end time'),
            description: z.string().optional().describe('Incident description')
          })
        )
        .describe('Traffic incidents in the area')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TomTomClient({ token: ctx.auth.token, adminKey: ctx.auth.adminKey });

    let data = await client.getTrafficIncidents({
      boundingBox: {
        minLat: ctx.input.minLat,
        minLon: ctx.input.minLon,
        maxLat: ctx.input.maxLat,
        maxLon: ctx.input.maxLon
      },
      language: ctx.input.language
    });

    let rawIncidents = data.incidents || [];
    let incidents = rawIncidents.map((inc: any) => {
      let props = inc.properties || {};
      let events = props.events || [];
      let description = events
        .map((e: any) => e.description)
        .filter(Boolean)
        .join('; ');

      return {
        incidentId: props.id,
        incidentType: inc.type,
        severity: props.iconCategory,
        magnitudeOfDelay: props.magnitudeOfDelay,
        from: props.from,
        to: props.to,
        lengthInMeters: props.length,
        delayInSeconds: props.delay,
        roadNumbers: props.roadNumbers,
        startTime: props.startTime,
        endTime: props.endTime,
        description: description || undefined
      };
    });

    return {
      output: { incidents },
      message: `Found **${incidents.length}** traffic incident(s) in the specified area.`
    };
  })
  .build();

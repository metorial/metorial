import { SlateTool } from 'slates';
import { z } from 'zod';
import { HereClient } from '../lib/client';
import { spec } from '../spec';

export let getTraffic = SlateTool.create(spec, {
  name: 'Get Traffic',
  key: 'get_traffic',
  description: `Retrieve real-time traffic flow data and/or traffic incidents for a geographic area. Supports two modes:
- **Flow**: Speed values, jam factors, and congestion levels for road segments
- **Incidents**: Active traffic incidents (accidents, construction, closures) with descriptions

Combine both for a complete traffic picture of an area.`,
  instructions: [
    'Use "inArea" to specify the geographic area, e.g. "bbox:13.3,52.5,13.4,52.6" for a bounding box or "circle:52.5,13.4;r=5000" for a radius.',
    'Set "includeFlow" and/or "includeIncidents" to true to select which data to retrieve.',
    'The jam factor ranges from 0 (free flow) to 10 (road closure).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      inArea: z
        .string()
        .describe(
          'Geographic filter: "bbox:west,south,east,north", "circle:lat,lng;r=radius", or "corridor:POLYLINE;r=radius"'
        ),
      includeFlow: z.boolean().optional().describe('Include traffic flow data (default true)'),
      includeIncidents: z
        .boolean()
        .optional()
        .describe('Include traffic incidents (default true)'),
      locationReferencing: z
        .enum(['shape', 'tmc', 'olr', 'none'])
        .optional()
        .describe('Location referencing method (default "shape")'),
      minJamFactor: z
        .number()
        .optional()
        .describe('Minimum jam factor filter (0-10, flow only)'),
      maxJamFactor: z
        .number()
        .optional()
        .describe('Maximum jam factor filter (0-10, flow only)'),
      lang: z.string().optional().describe('Language for incident descriptions (e.g. "en-US")')
    })
  )
  .output(
    z.object({
      flow: z
        .object({
          results: z
            .array(
              z.object({
                location: z.any().optional().describe('Road segment location'),
                currentFlow: z
                  .object({
                    speed: z.number().optional().describe('Current speed in m/s'),
                    speedUncapped: z.number().optional().describe('Uncapped speed in m/s'),
                    freeFlow: z.number().optional().describe('Free flow speed in m/s'),
                    jamFactor: z
                      .number()
                      .optional()
                      .describe('Jam factor (0=free flow, 10=closed)'),
                    confidence: z.number().optional().describe('Data confidence'),
                    traversability: z
                      .string()
                      .optional()
                      .describe('Road traversability status')
                  })
                  .optional()
              })
            )
            .optional()
        })
        .optional()
        .describe('Traffic flow data'),
      incidents: z
        .object({
          results: z
            .array(
              z.object({
                incidentId: z.string().optional().describe('Incident identifier'),
                type: z.string().optional().describe('Incident type'),
                description: z.any().optional().describe('Incident description'),
                location: z.any().optional().describe('Incident location'),
                startTime: z.string().optional().describe('Incident start time'),
                endTime: z.string().optional().describe('Incident end time'),
                criticality: z.string().optional().describe('Incident criticality level')
              })
            )
            .optional()
        })
        .optional()
        .describe('Traffic incident data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HereClient({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let includeFlow = ctx.input.includeFlow !== false;
    let includeIncidents = ctx.input.includeIncidents !== false;

    let flowResult: any;
    let incidentsResult: any;

    if (includeFlow) {
      let flowResponse = await client.getTrafficFlow({
        inArea: ctx.input.inArea,
        locationReferencing: ctx.input.locationReferencing,
        minJamFactor: ctx.input.minJamFactor,
        maxJamFactor: ctx.input.maxJamFactor
      });
      flowResult = {
        results: flowResponse.results?.map((r: any) => ({
          location: r.location,
          currentFlow: r.currentFlow
        }))
      };
    }

    if (includeIncidents) {
      let incResponse = await client.getTrafficIncidents({
        inArea: ctx.input.inArea,
        locationReferencing: ctx.input.locationReferencing,
        lang: ctx.input.lang
      });
      incidentsResult = {
        results: incResponse.results?.map((r: any) => ({
          incidentId: r.incidentDetails?.id,
          type: r.incidentDetails?.type,
          description: r.incidentDetails?.description,
          location: r.location,
          startTime: r.incidentDetails?.startTime,
          endTime: r.incidentDetails?.endTime,
          criticality: r.incidentDetails?.criticality
        }))
      };
    }

    let flowCount = flowResult?.results?.length || 0;
    let incidentCount = incidentsResult?.results?.length || 0;
    let parts: string[] = [];
    if (includeFlow) parts.push(`**${flowCount}** flow segment(s)`);
    if (includeIncidents) parts.push(`**${incidentCount}** incident(s)`);

    return {
      output: {
        flow: flowResult,
        incidents: incidentsResult
      },
      message: `Retrieved ${parts.join(' and ')} for the specified area.`
    };
  })
  .build();

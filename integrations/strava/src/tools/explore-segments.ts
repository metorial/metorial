import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let exploreSegments = SlateTool.create(spec, {
  name: 'Explore Segments',
  key: 'explore_segments',
  description: `Search for popular segments within a geographic bounding box. Filter by activity type (running or riding) and climb category. Returns segment summaries with location, distance, and climb data.`,
  instructions: [
    'Bounds format: "south_lat,west_lng,north_lat,east_lng" (comma-separated)',
    'Climb category ranges from 0 (HC/hardest) to 5 (easiest)'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      bounds: z.string().describe('Bounding box as "south_lat,west_lng,north_lat,east_lng"'),
      activityType: z
        .enum(['running', 'riding'])
        .optional()
        .describe('Filter by activity type'),
      minClimbCategory: z
        .number()
        .optional()
        .describe('Minimum climb category (0=HC, 5=easiest)'),
      maxClimbCategory: z
        .number()
        .optional()
        .describe('Maximum climb category (0=HC, 5=easiest)')
    })
  )
  .output(
    z.object({
      segments: z
        .array(
          z.object({
            segmentId: z.number().describe('Segment identifier'),
            name: z.string().describe('Segment name'),
            climbCategory: z.number().describe('Climb category'),
            climbCategoryDesc: z.string().describe('Climb category description'),
            averageGrade: z.number().describe('Average grade percentage'),
            startLatlng: z.array(z.number()).describe('[latitude, longitude] of start'),
            endLatlng: z.array(z.number()).describe('[latitude, longitude] of end'),
            elevationDifference: z.number().describe('Elevation difference in meters'),
            distance: z.number().describe('Distance in meters'),
            points: z.string().optional().describe('Encoded polyline of the segment')
          })
        )
        .describe('Discovered segments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.exploreSegments({
      bounds: ctx.input.bounds,
      activityType: ctx.input.activityType,
      minCat: ctx.input.minClimbCategory,
      maxCat: ctx.input.maxClimbCategory
    });

    let segments = (result.segments || []).map((s: any) => ({
      segmentId: s.id,
      name: s.name,
      climbCategory: s.climb_category,
      climbCategoryDesc: s.climb_category_desc,
      averageGrade: s.avg_grade,
      startLatlng: s.start_latlng,
      endLatlng: s.end_latlng,
      elevationDifference: s.elev_difference,
      distance: s.distance,
      points: s.points
    }));

    return {
      output: { segments },
      message: `Found **${segments.length}** segments in the specified area.`
    };
  })
  .build();

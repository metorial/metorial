import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let segmentOutputSchema = z.object({
  segmentId: z.string().describe('Unique identifier of the segment'),
  listId: z.string().describe('ID of the list the segment belongs to'),
  name: z.string().describe('Name of the segment'),
  definition: z
    .string()
    .describe('JSON-formatted segment definition based on custom field conditions'),
  state: z.string().describe('Current state of the segment'),
  created: z.string().describe('Creation timestamp'),
  modified: z.string().describe('Last modified timestamp')
});

export let getSegments = SlateTool.create(spec, {
  name: 'Get Segments',
  key: 'get_segments',
  description: `Retrieves segments defined on a Laposta mailing list. Provide a **segmentId** to get a specific segment, or omit it to get all segments for the list.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list to retrieve segments from'),
      segmentId: z.string().optional().describe('ID of a specific segment to retrieve')
    })
  )
  .output(
    z.object({
      segments: z.array(segmentOutputSchema).describe('Retrieved segments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.segmentId) {
      let result = await client.getSegment(ctx.input.segmentId, ctx.input.listId);
      let seg = result.segment;
      return {
        output: {
          segments: [
            {
              segmentId: seg.segment_id,
              listId: seg.list_id,
              name: seg.name,
              definition: seg.definition,
              state: seg.state,
              created: seg.created,
              modified: seg.modified
            }
          ]
        },
        message: `Retrieved segment **${seg.name}**.`
      };
    }

    let results = await client.getSegments(ctx.input.listId);
    let segments = results.map(r => {
      let seg = r.segment;
      return {
        segmentId: seg.segment_id,
        listId: seg.list_id,
        name: seg.name,
        definition: seg.definition,
        state: seg.state,
        created: seg.created,
        modified: seg.modified
      };
    });

    return {
      output: { segments },
      message: `Retrieved ${segments.length} segment(s).`
    };
  })
  .build();

export let createSegment = SlateTool.create(spec, {
  name: 'Create Segment',
  key: 'create_segment',
  description: `Creates a new segment on a Laposta mailing list based on custom field conditions. Segment definitions use JSON format referencing field values.`,
  instructions: [
    'Segment definitions are best composed in the Laposta UI first, then retrieved and reused via the API.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list to create the segment on'),
      name: z.string().describe('Name of the segment'),
      definition: z.string().describe('JSON-formatted segment definition string')
    })
  )
  .output(segmentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createSegment({
      listId: ctx.input.listId,
      name: ctx.input.name,
      definition: ctx.input.definition
    });

    let seg = result.segment;
    return {
      output: {
        segmentId: seg.segment_id,
        listId: seg.list_id,
        name: seg.name,
        definition: seg.definition,
        state: seg.state,
        created: seg.created,
        modified: seg.modified
      },
      message: `Created segment **${seg.name}** on list ${seg.list_id}.`
    };
  })
  .build();

export let updateSegment = SlateTool.create(spec, {
  name: 'Update Segment',
  key: 'update_segment',
  description: `Updates an existing segment on a Laposta mailing list. Can change the name and/or the definition.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list the segment belongs to'),
      segmentId: z.string().describe('ID of the segment to update'),
      name: z.string().optional().describe('New name for the segment'),
      definition: z.string().optional().describe('New JSON-formatted segment definition')
    })
  )
  .output(segmentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateSegment(ctx.input.segmentId, {
      listId: ctx.input.listId,
      name: ctx.input.name,
      definition: ctx.input.definition
    });

    let seg = result.segment;
    return {
      output: {
        segmentId: seg.segment_id,
        listId: seg.list_id,
        name: seg.name,
        definition: seg.definition,
        state: seg.state,
        created: seg.created,
        modified: seg.modified
      },
      message: `Updated segment **${seg.name}**.`
    };
  })
  .build();

export let deleteSegment = SlateTool.create(spec, {
  name: 'Delete Segment',
  key: 'delete_segment',
  description: `Permanently deletes a segment from a Laposta mailing list.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      listId: z.string().describe('ID of the list the segment belongs to'),
      segmentId: z.string().describe('ID of the segment to delete')
    })
  )
  .output(segmentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteSegment(ctx.input.segmentId, ctx.input.listId);

    let seg = result.segment;
    return {
      output: {
        segmentId: seg.segment_id,
        listId: seg.list_id,
        name: seg.name,
        definition: seg.definition,
        state: seg.state,
        created: seg.created,
        modified: seg.modified
      },
      message: `Deleted segment **${seg.name}** from list ${seg.list_id}.`
    };
  })
  .build();

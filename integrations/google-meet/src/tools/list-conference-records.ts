import { SlateTool } from 'slates';
import { z } from 'zod';
import { MeetClient } from '../lib/client';
import { googleMeetActionScopes } from '../scopes';
import { spec } from '../spec';

export let listConferenceRecordsTool = SlateTool.create(spec, {
  name: 'List Conference Records',
  key: 'list_conference_records',
  description: `List conference records for past and ongoing meetings. Filter by space name, meeting code, or time range. Conference records contain start/end times and a reference to the meeting space.`,
  instructions: [
    'Filter examples: `space.meeting_code="abc-mnop-xyz"`, `space.name="spaces/abc123"`, `start_time>="2024-01-01T00:00:00Z"`.',
    'Conference records expire 30 days after the conference ends.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleMeetActionScopes.listConferenceRecords)
  .input(
    z.object({
      filter: z
        .string()
        .optional()
        .describe(
          'Filter expression (e.g., space.meeting_code="abc-mnop-xyz" or start_time>="2024-01-01T00:00:00Z")'
        ),
      pageSize: z.number().optional().describe('Maximum number of records to return'),
      pageToken: z.string().optional().describe('Page token for pagination')
    })
  )
  .output(
    z.object({
      conferenceRecords: z.array(
        z.object({
          conferenceRecordName: z.string().describe('Resource name of the conference record'),
          spaceName: z.string().optional().describe('Associated space resource name'),
          startTime: z.string().optional().describe('When the conference started'),
          endTime: z
            .string()
            .optional()
            .describe('When the conference ended (empty if still active)'),
          expireTime: z.string().optional().describe('When this record expires')
        })
      ),
      nextPageToken: z.string().optional().describe('Token for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MeetClient({ token: ctx.auth.token });

    let result = await client.listConferenceRecords(
      ctx.input.filter,
      ctx.input.pageSize,
      ctx.input.pageToken
    );

    let records = result.conferenceRecords.map(r => ({
      conferenceRecordName: r.name || '',
      spaceName: r.space,
      startTime: r.startTime,
      endTime: r.endTime,
      expireTime: r.expireTime
    }));

    return {
      output: {
        conferenceRecords: records,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${records.length}** conference record(s).${result.nextPageToken ? ' More results available.' : ''}`
    };
  })
  .build();

export let getConferenceRecordTool = SlateTool.create(spec, {
  name: 'Get Conference Record',
  key: 'get_conference_record',
  description: `Retrieve details of a specific conference record including start/end times and the associated meeting space.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(googleMeetActionScopes.getConferenceRecord)
  .input(
    z.object({
      conferenceRecordName: z
        .string()
        .describe('Conference record resource name (e.g., "conferenceRecords/abc123")')
    })
  )
  .output(
    z.object({
      conferenceRecordName: z.string().describe('Resource name'),
      spaceName: z.string().optional().describe('Associated space'),
      startTime: z.string().optional().describe('Conference start time'),
      endTime: z.string().optional().describe('Conference end time'),
      expireTime: z.string().optional().describe('Record expiration time')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MeetClient({ token: ctx.auth.token });
    let record = await client.getConferenceRecord(ctx.input.conferenceRecordName);

    return {
      output: {
        conferenceRecordName: record.name || '',
        spaceName: record.space,
        startTime: record.startTime,
        endTime: record.endTime,
        expireTime: record.expireTime
      },
      message: `Retrieved conference record **${record.name}**${record.endTime ? ` (ended ${record.endTime})` : ' (active)'}.`
    };
  })
  .build();

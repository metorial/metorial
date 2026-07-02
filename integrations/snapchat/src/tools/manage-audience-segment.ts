import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { SnapchatClient } from '../lib/client';
import { snapchatServiceError } from '../lib/errors';
import { spec } from '../spec';

let segmentOutputSchema = z.object({
  segmentId: z.string().describe('Unique ID of the audience segment'),
  adAccountId: z.string().optional().describe('Parent ad account ID'),
  name: z.string().optional().describe('Segment name'),
  description: z.string().optional().describe('Segment description'),
  status: z.string().optional().describe('Segment status'),
  sourceType: z.string().optional().describe('Source type (e.g., FIRST_PARTY)'),
  retentionInDays: z.number().optional().describe('Retention period in days'),
  approximateNumberUsers: z
    .number()
    .optional()
    .describe('Approximate number of matched users'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let manageAudienceSegment = SlateTool.create(spec, {
  name: 'Manage Audience Segment',
  key: 'manage_audience_segment',
  description: `Create or update a Snapchat custom audience segment. Segments can be customer lists (hashed emails, phones, mobile ad IDs), pixel-based audiences, or lookalike audiences. To create, provide **adAccountId** and segment properties. To update, also provide **segmentId**.`,
  instructions: [
    'For customer lists, user identifiers must be SHA-256 hashed before uploading.',
    'A minimum of 1,000 matched users is required for a segment to be usable for targeting.',
    'Use the Add Users to Segment tool to populate customer list segments after creation.'
  ]
})
  .input(
    z.object({
      adAccountId: z.string().describe('Ad account ID the segment belongs to'),
      segmentId: z
        .string()
        .optional()
        .describe('Segment ID to update (omit to create a new segment)'),
      name: z.string().optional().describe('Segment name'),
      description: z.string().optional().describe('Segment description'),
      sourceType: z
        .string()
        .optional()
        .describe('Source type (FIRST_PARTY, ENGAGEMENT, PIXEL, LOOKALIKE)'),
      retentionInDays: z
        .number()
        .optional()
        .describe('Number of days to retain users in the segment')
    })
  )
  .output(segmentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new SnapchatClient(ctx.auth.token);
    let { adAccountId, segmentId, ...fields } = ctx.input;

    if (!segmentId) {
      if (!fields.name) {
        throw snapchatServiceError('name is required to create an audience segment.');
      }
      if (!fields.sourceType) {
        throw snapchatServiceError('sourceType is required to create an audience segment.');
      }
    }

    let segmentData: Record<string, any> = {};
    if (segmentId) segmentData.id = segmentId;
    if (fields.name) segmentData.name = fields.name;
    if (fields.description) segmentData.description = fields.description;
    if (fields.sourceType) segmentData.source_type = fields.sourceType;
    if (fields.retentionInDays !== undefined)
      segmentData.retention_in_days = fields.retentionInDays;

    let result: any;
    if (segmentId) {
      result = await client.updateSegment(adAccountId, segmentData);
    } else {
      result = await client.createSegment(adAccountId, segmentData);
    }

    if (!result) {
      throw snapchatServiceError(
        'Snapchat did not return an audience segment in the API response.'
      );
    }

    let output = {
      segmentId: result.id,
      adAccountId: result.ad_account_id,
      name: result.name,
      description: result.description,
      status: result.status,
      sourceType: result.source_type,
      retentionInDays: result.retention_in_days,
      approximateNumberUsers: result.approximate_number_users,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };

    let action = segmentId ? 'Updated' : 'Created';
    return {
      output,
      message: `${action} audience segment **${output.name}** (${output.segmentId}).`
    };
  })
  .build();

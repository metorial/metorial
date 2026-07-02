import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let submitPlaceFeedback = SlateTool.create(spec, {
  name: 'Submit Place Feedback',
  key: 'submit_place_feedback',
  description: `Propose edits to place attributes or flag problematic places in the Foursquare database. Supports two modes: **propose an edit** to correct or update place details (name, address, phone, categories, etc.), or **flag a problem** to report issues like closures, duplicates, or incorrect locations.`,
  instructions: [
    'Set feedbackType to "edit" to propose changes to a place, or "flag" to report a problem.',
    'For edits: provide any fields you want to change. Only changed fields are needed.',
    'For flags: the problemType field is required. Use "duplicate" with duplicateFsqId if flagging a duplicate.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      fsqId: z.string().describe('Foursquare place ID to provide feedback on'),
      feedbackType: z
        .enum(['edit', 'flag'])
        .describe('Type of feedback: "edit" to propose changes, "flag" to report a problem'),
      name: z.string().optional().describe('Proposed new name (edit only)'),
      address: z.string().optional().describe('Proposed new address (edit only)'),
      crossStreet: z.string().optional().describe('Cross street (edit only)'),
      locality: z.string().optional().describe('City/locality (edit only)'),
      region: z.string().optional().describe('State/region (edit only)'),
      postcode: z.string().optional().describe('Postal code (edit only)'),
      country: z.string().optional().describe('Country code (edit only)'),
      tel: z.string().optional().describe('Phone number (edit only)'),
      website: z.string().optional().describe('Website URL (edit only)'),
      email: z.string().optional().describe('Email address (edit only)'),
      categoryIds: z.array(z.string()).optional().describe('Updated category IDs (edit only)'),
      latitude: z
        .number()
        .optional()
        .describe('Corrected latitude (edit or flag with mislocated)'),
      longitude: z
        .number()
        .optional()
        .describe('Corrected longitude (edit or flag with mislocated)'),
      problemType: z
        .enum([
          'mislocated',
          'closed',
          'duplicate',
          'inappropriate',
          'doesnt_exist',
          'private',
          'event_over'
        ])
        .optional()
        .describe('Problem type (flag only, required when feedbackType is "flag")'),
      duplicateFsqId: z
        .string()
        .optional()
        .describe(
          'Foursquare ID of the duplicate place (flag only, used with "duplicate" problemType)'
        ),
      comment: z.string().optional().describe('Additional comment about the flag (flag only)')
    })
  )
  .output(
    z.object({
      feedbackId: z.string().optional().describe('Feedback submission ID for status tracking'),
      status: z.string().optional().describe('Current status of the submission')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.feedbackType === 'edit') {
      result = await client.proposeEdit(ctx.input.fsqId, {
        name: ctx.input.name,
        address: ctx.input.address,
        cross_street: ctx.input.crossStreet,
        locality: ctx.input.locality,
        region: ctx.input.region,
        postcode: ctx.input.postcode,
        country: ctx.input.country,
        tel: ctx.input.tel,
        website: ctx.input.website,
        email: ctx.input.email,
        category_ids: ctx.input.categoryIds,
        latitude: ctx.input.latitude,
        longitude: ctx.input.longitude
      });
    } else {
      if (!ctx.input.problemType) {
        throw new Error('problemType is required when feedbackType is "flag"');
      }
      result = await client.flagPlace(ctx.input.fsqId, {
        problem: ctx.input.problemType,
        duplicate_fsq_id: ctx.input.duplicateFsqId,
        comment: ctx.input.comment,
        latitude: ctx.input.latitude,
        longitude: ctx.input.longitude
      });
    }

    return {
      output: {
        feedbackId: result?.id,
        status: result?.status || 'submitted'
      },
      message:
        ctx.input.feedbackType === 'edit'
          ? `Proposed edit submitted for place ${ctx.input.fsqId}.`
          : `Flagged place ${ctx.input.fsqId} as "${ctx.input.problemType}".`
    };
  })
  .build();

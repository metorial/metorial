import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let weekdayHours = z
  .string()
  .nullable()
  .optional()
  .describe(
    '24-hour opening interval such as 09:00-17:00, closed, or null to clear this day. Omit to preserve it.'
  );

export let updateLocation = SlateTool.create(spec, {
  name: 'Update Location',
  key: 'update_location',
  description:
    'Updates selected StoreRocket location fields without resending the whole location. Call list_projects and list_project_locations to discover IDs. Requires a V2 token with location:update permission and project API access. Returns the complete updated-location response.',
  instructions: [
    'Supply only fields you want to change. Omitted fields keep their saved values.',
    'Send phone null to clear the phone. Send hours null to remove the schedule, or a day value null to clear that day. An empty hours object preserves the schedule.',
    'False visibility is valid. Name and city cannot be null or blank. Validation errors reject the entire update.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      projectId: z
        .string()
        .describe('Public project ID. Call list_projects to discover authorized project IDs.'),
      locationId: z
        .string()
        .describe('Public location ID from list_project_locations for this project.'),
      phone: z
        .string()
        .nullable()
        .optional()
        .describe('New phone number, or null to clear it. Omit to preserve it.'),
      name: z
        .string()
        .max(255)
        .optional()
        .describe('Nonempty location name, at most 255 characters. Omit to preserve it.'),
      city: z
        .string()
        .max(255)
        .optional()
        .describe('Nonempty city, at most 255 characters. Omit to preserve it.'),
      visible: z
        .boolean()
        .optional()
        .describe('True to show or false to hide the location. Omit to preserve visibility.'),
      hours: z
        .object({
          mon: weekdayHours,
          tue: weekdayHours,
          wed: weekdayHours,
          thu: weekdayHours,
          fri: weekdayHours,
          sat: weekdayHours,
          sun: weekdayHours
        })
        .nullable()
        .optional()
        .describe(
          'Selected weekday updates. Omit or use {} to preserve hours; null removes the schedule. Unspecified days remain unchanged.'
        )
    })
  )
  .output(
    z.object({
      location: z
        .any()
        .describe(
          'Complete provider response containing the updated location, preserving raw fields and nulls.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    return {
      output: { location: await client.updateLocation(ctx.input) },
      message: 'Updated StoreRocket location.'
    };
  })
  .build();

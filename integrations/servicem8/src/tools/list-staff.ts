import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let staffSchema = z.object({
  staffUuid: z.string().describe('Unique identifier for the staff member'),
  first: z.string().optional().describe('First name'),
  last: z.string().optional().describe('Last name'),
  email: z.string().optional().describe('Email address'),
  mobile: z.string().optional().describe('Mobile phone number'),
  active: z.number().optional().describe('1 = active, 0 = deleted'),
  editDate: z.string().optional().describe('Timestamp when the record was last modified')
});

export let listStaff = SlateTool.create(spec, {
  name: 'List Staff',
  key: 'list_staff',
  description: `List staff members in ServiceM8. Supports OData-style filtering on fields like **active**. Returns all matching staff records with names, email, and mobile.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .string()
        .optional()
        .describe('OData-style filter expression, e.g. "active eq 1"')
    })
  )
  .output(
    z.object({
      staff: z.array(staffSchema).describe('List of staff members')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let staffList = await client.listStaff({ filter: ctx.input.filter });

    let mapped = staffList.map((s: any) => ({
      staffUuid: s.uuid,
      first: s.first,
      last: s.last,
      email: s.email,
      mobile: s.mobile,
      active: s.active,
      editDate: s.edit_date
    }));

    return {
      output: { staff: mapped },
      message: `Found **${mapped.length}** staff member(s).`
    };
  })
  .build();

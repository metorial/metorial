import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let staffSchema = z.object({
  staffId: z.number().describe('Unique ID of the staff member'),
  name: z.string().describe('Full name'),
  email: z.string().optional().describe('Email address'),
  phone: z.string().optional().describe('Phone number'),
  mobile: z.string().optional().describe('Mobile phone number'),
  title: z.string().optional().describe('Job title'),
  extension: z.string().optional().describe('Phone extension')
});

export let listStaff = SlateTool.create(spec, {
  name: 'List Staff',
  key: 'list_staff',
  description: `Retrieve staff members in the Clientary account. Can list all staff or get a specific member by ID. Staff management (create/update/delete) is only available through the Clientary dashboard.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      staffId: z
        .number()
        .optional()
        .describe('ID of a specific staff member to retrieve. If omitted, lists all staff.')
    })
  )
  .output(
    z.object({
      staff: z.array(staffSchema).describe('List of staff members')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, subdomain: ctx.config.subdomain });

    if (ctx.input.staffId) {
      let result = await client.getStaffMember(ctx.input.staffId);
      let s = result.staff || result;
      return {
        output: {
          staff: [
            {
              staffId: s.id,
              name: s.name,
              email: s.email,
              phone: s.phone,
              mobile: s.mobile,
              title: s.title,
              extension: s.ext
            }
          ]
        },
        message: `Retrieved staff member **${s.name}** (ID: ${s.id}).`
      };
    }

    let result = await client.listStaff();
    let staff = (result.staff || []).map((s: any) => ({
      staffId: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      mobile: s.mobile,
      title: s.title,
      extension: s.ext
    }));

    return {
      output: { staff },
      message: `Retrieved ${staff.length} staff member(s).`
    };
  })
  .build();

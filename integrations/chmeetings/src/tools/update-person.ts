import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let addressSchema = z
  .object({
    country: z.string().optional().describe('Country name'),
    city: z.string().optional().describe('City name'),
    addressLine: z.string().optional().describe('Street address line'),
    zipCode: z.string().optional().describe('ZIP/postal code'),
    buildingNo: z.string().optional().describe('Building number'),
    state: z.string().optional().describe('State or province')
  })
  .optional()
  .describe('Updated address details');

export let updatePerson = SlateTool.create(spec, {
  name: 'Update Person',
  key: 'update_person',
  description: `Update an existing person's profile in ChMeetings. Only provide the fields you want to change; omitted fields remain unchanged.`
})
  .input(
    z.object({
      personId: z.number().describe('ID of the person to update'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      middleName: z.string().optional().describe('Middle name'),
      nativeName: z.string().optional().describe('Native name'),
      email: z.string().optional().describe('Email address'),
      mobile: z.string().optional().describe('Mobile phone number'),
      birthDate: z.string().optional().describe('Date of birth (YYYY-MM-DD)'),
      gender: z.string().optional().describe('Gender'),
      socialStatus: z.string().optional().describe('Marital/social status'),
      jobTitle: z.string().optional().describe('Job title'),
      workPlace: z.string().optional().describe('Workplace'),
      baptismDate: z.string().optional().describe('Baptism date (YYYY-MM-DD)'),
      doNotText: z.boolean().optional().describe('Opt out of text messages'),
      doNotEmail: z.boolean().optional().describe('Opt out of emails'),
      envelopeNumber: z.number().optional().describe('Envelope number for contributions'),
      address: addressSchema
    })
  )
  .output(
    z.object({
      person: z.record(z.string(), z.unknown()).describe('Updated person record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let updateData: Record<string, unknown> = {};
    if (ctx.input.firstName !== undefined) updateData.first_name = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) updateData.last_name = ctx.input.lastName;
    if (ctx.input.middleName !== undefined) updateData.middle_name = ctx.input.middleName;
    if (ctx.input.nativeName !== undefined) updateData.native_name = ctx.input.nativeName;
    if (ctx.input.email !== undefined) updateData.email = ctx.input.email;
    if (ctx.input.mobile !== undefined) updateData.mobile = ctx.input.mobile;
    if (ctx.input.birthDate !== undefined) updateData.birth_date = ctx.input.birthDate;
    if (ctx.input.gender !== undefined) updateData.gender = ctx.input.gender;
    if (ctx.input.socialStatus !== undefined)
      updateData.social_status = ctx.input.socialStatus;
    if (ctx.input.jobTitle !== undefined) updateData.job_title = ctx.input.jobTitle;
    if (ctx.input.workPlace !== undefined) updateData.work_place = ctx.input.workPlace;
    if (ctx.input.baptismDate !== undefined) updateData.baptism_date = ctx.input.baptismDate;
    if (ctx.input.doNotText !== undefined) updateData.do_not_text = ctx.input.doNotText;
    if (ctx.input.doNotEmail !== undefined) updateData.do_not_email = ctx.input.doNotEmail;
    if (ctx.input.envelopeNumber !== undefined)
      updateData.envelope_number = ctx.input.envelopeNumber;
    if (ctx.input.address !== undefined) {
      updateData.address = {
        country: ctx.input.address.country,
        city: ctx.input.address.city,
        address_line: ctx.input.address.addressLine,
        zip_code: ctx.input.address.zipCode,
        building_no: ctx.input.address.buildingNo,
        state: ctx.input.address.state
      };
    }

    let result = await client.updatePerson(ctx.input.personId, updateData);

    return {
      output: {
        person: result.data as Record<string, unknown>
      },
      message: `Updated person with ID **${ctx.input.personId}**.`
    };
  })
  .build();

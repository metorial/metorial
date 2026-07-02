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
  .describe('Address details');

export let createPerson = SlateTool.create(spec, {
  name: 'Create Person',
  key: 'create_person',
  description: `Create a new person record in ChMeetings. First name and last name are required. All other profile fields are optional.`
})
  .input(
    z.object({
      firstName: z.string().describe('First name (required)'),
      lastName: z.string().describe('Last name (required)'),
      middleName: z.string().optional().describe('Middle name'),
      nativeName: z.string().optional().describe('Native name (if Native Names are enabled)'),
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
      person: z.record(z.string(), z.unknown()).describe('Created person record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createPerson({
      first_name: ctx.input.firstName,
      last_name: ctx.input.lastName,
      middle_name: ctx.input.middleName,
      native_name: ctx.input.nativeName,
      email: ctx.input.email,
      mobile: ctx.input.mobile,
      birth_date: ctx.input.birthDate,
      gender: ctx.input.gender,
      social_status: ctx.input.socialStatus,
      job_title: ctx.input.jobTitle,
      work_place: ctx.input.workPlace,
      baptism_date: ctx.input.baptismDate,
      do_not_text: ctx.input.doNotText,
      do_not_email: ctx.input.doNotEmail,
      envelope_number: ctx.input.envelopeNumber,
      address: ctx.input.address
        ? {
            country: ctx.input.address.country,
            city: ctx.input.address.city,
            address_line: ctx.input.address.addressLine,
            zip_code: ctx.input.address.zipCode,
            building_no: ctx.input.address.buildingNo,
            state: ctx.input.address.state
          }
        : undefined
    });

    return {
      output: {
        person: result.data as Record<string, unknown>
      },
      message: `Created person **${ctx.input.firstName} ${ctx.input.lastName}**.`
    };
  })
  .build();

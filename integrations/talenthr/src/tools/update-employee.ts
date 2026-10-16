import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, providerId, validateDate, validateText } from '../lib/client';
import { spec } from '../spec';

let emergencyContactSchema = z
  .object({
    fullName: z.string().optional().describe('Emergency contact full name'),
    relationshipTypeId: z.string().optional().describe('Relationship type ID'),
    phone: z.string().optional().describe('Emergency contact phone number'),
    address: z.string().optional().describe('Emergency contact address')
  })
  .optional()
  .describe('Emergency contact information');

export let updateEmployee = SlateTool.create(spec, {
  name: 'Update Employee',
  key: 'update_employee',
  description: `Update an existing employee's profile data in TalentHR. Supports updating personal info, contact details, address, emergency contact, social media links, identification documents, and other profile fields.
Only provide the fields you want to change. If firstName, lastName, or email is omitted, this tool first reads the employee profile and resubmits those existing required values. The update fails if that profile cannot supply them.`,
  instructions: [
    'Birth date must be formatted as YYYY-MM-DD and between 1930-01-01 and today.',
    'Personal email must be unique among personal emails in the system.',
    'Setting reportsToEmployeeId to null makes the employee head of the company.',
    'Date fields (birth, passport, visa, driver license) use YYYY-MM-DD format.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      employeeId: z.string().describe('ID of the employee to update'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Work email address'),
      reportsToEmployeeId: z
        .string()
        .optional()
        .nullable()
        .describe('Manager employee ID, or null to make head of company'),
      ssn: z.string().optional().describe('Social security number'),
      birthDate: z.string().optional().describe('Birth date in YYYY-MM-DD format'),
      personalEmail: z.string().optional().describe('Personal email (must be unique)'),
      maritalStatus: z
        .enum(['Single', 'Separated', 'Married', 'Widowed'])
        .optional()
        .describe('Marital status'),
      gender: z.enum(['Male', 'Female', 'Non-binary']).optional().describe('Gender'),
      nationality: z.string().optional().describe('Nationality'),
      citizenship: z.string().optional().describe('Citizenship'),
      workPhone: z.string().optional().describe('Work phone number'),
      mobilePhone: z.string().optional().describe('Mobile phone number'),
      phone: z.string().optional().describe('Phone number'),
      address: z.string().optional().describe('Primary address'),
      country: z.string().optional().describe('Country'),
      postalCode: z.string().optional().describe('Postal code'),
      city: z.string().optional().describe('City'),
      emergencyContact: emergencyContactSchema,
      linkedInUrl: z.string().optional().describe('LinkedIn profile URL'),
      employeeNumber: z.string().optional().describe('External employee number'),
      passportNumber: z.string().optional().describe('Passport number'),
      passportIssuedDate: z.string().optional().describe('Passport issued date (YYYY-MM-DD)'),
      passportExpiryDate: z.string().optional().describe('Passport expiry date (YYYY-MM-DD)'),
      passportIssuingCountry: z.string().optional().describe('Passport issuing country'),
      visaType: z.string().optional().describe('Visa type'),
      visaNumber: z.string().optional().describe('Visa number'),
      visaExpiryDate: z.string().optional().describe('Visa expiry date (YYYY-MM-DD)'),
      driverLicenseNumber: z.string().optional().describe('Driver license number'),
      driverLicenseIssuedDate: z
        .string()
        .optional()
        .describe('Driver license issued date (YYYY-MM-DD)'),
      driverLicenseExpiryDate: z
        .string()
        .optional()
        .describe('Driver license expiry date (YYYY-MM-DD)'),
      driverLicenseIssuingCountry: z
        .string()
        .optional()
        .describe('Driver license issuing country'),
      secondaryAddress: z.string().optional().describe('Secondary address'),
      secondaryCity: z.string().optional().describe('Secondary city'),
      secondaryPostalCode: z.string().optional().describe('Secondary postal code'),
      secondaryCountry: z.string().optional().describe('Secondary country'),
      twitterUrl: z.string().optional().describe('Twitter URL'),
      facebookUrl: z.string().optional().describe('Facebook URL'),
      instagramUrl: z.string().optional().describe('Instagram URL'),
      pinterestUrl: z.string().optional().describe('Pinterest URL'),
      githubUrl: z.string().optional().describe('GitHub URL'),
      behanceUrl: z.string().optional().describe('Behance URL'),
      skypeName: z.string().optional().describe('Skype username'),
      shirtSize: z.string().optional().describe('Shirt size'),
      tShirtSize: z.string().optional().describe('T-shirt size'),
      allergies: z.string().optional().describe('Employee allergies')
    })
  )
  .output(
    z.object({
      employeeId: z.string().describe('ID of the updated employee'),
      rawResponse: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    for (const [key, value] of Object.entries(ctx.input)) {
      if (typeof value !== 'string' || key === 'employeeId') continue;
      if (['shirtSize', 'tShirtSize', 'reportsToEmployeeId'].includes(key)) {
        providerId(value, key);
        continue;
      }
      if (
        [
          'birthDate',
          'passportIssuedDate',
          'passportExpiryDate',
          'visaExpiryDate',
          'driverLicenseIssuedDate',
          'driverLicenseExpiryDate'
        ].includes(key)
      ) {
        validateDate(value, key);
        if (
          key === 'birthDate' &&
          (value < '1930-01-01' || value > new Date().toISOString().slice(0, 10))
        )
          throw createApiServiceError('birthDate must be between 1930-01-01 and today.');
        if (key === 'passportIssuedDate' && value > new Date().toISOString().slice(0, 10))
          throw createApiServiceError('passportIssuedDate cannot be in the future.');
      } else if (key === 'allergies') {
        if (value.length > 4000)
          throw createApiServiceError('allergies must be at most 4000 characters.');
      } else if (['passportNumber', 'visaNumber', 'driverLicenseNumber'].includes(key)) {
        if (value.length > 64)
          throw createApiServiceError(`${key} must be at most 64 characters.`);
      } else if (
        [
          'firstName',
          'lastName',
          'email',
          'ssn',
          'personalEmail',
          'workPhone',
          'mobilePhone',
          'phone',
          'address',
          'postalCode',
          'city',
          'employeeNumber',
          'passportIssuingCountry',
          'visaType',
          'driverLicenseIssuingCountry',
          'secondaryAddress',
          'secondaryCity',
          'secondaryPostalCode',
          'secondaryCountry',
          'twitterUrl',
          'facebookUrl',
          'instagramUrl',
          'pinterestUrl',
          'githubUrl',
          'behanceUrl',
          'skypeName'
        ].includes(key) &&
        value.length > 191
      )
        throw createApiServiceError(`${key} must be at most 191 characters.`);
      if (['firstName', 'lastName', 'email'].includes(key)) validateText(value, key, 191);
      if (
        ['email', 'personalEmail'].includes(key) &&
        value &&
        !z.email().safeParse(value).success
      )
        throw createApiServiceError(`${key} must be a valid email address.`);
      if (key.endsWith('Url') && value && !z.url().safeParse(value).success)
        throw createApiServiceError(`${key} must be a valid URL.`);
    }
    let data: Record<string, unknown> = {};

    let fieldMap: Record<string, string> = {
      firstName: 'first_name',
      lastName: 'last_name',
      email: 'email',
      reportsToEmployeeId: 'reports_to_employee_id',
      ssn: 'ssn',
      birthDate: 'birth_date',
      personalEmail: 'personal_email',
      maritalStatus: 'marital_status',
      gender: 'gender',
      nationality: 'nationality',
      citizenship: 'citizenship',
      workPhone: 'work_phone',
      mobilePhone: 'mobile_phone',
      phone: 'phone',
      address: 'address',
      country: 'country',
      postalCode: 'postal_code',
      city: 'city',
      linkedInUrl: 'linked_in_url',
      employeeNumber: 'employee_number',
      passportNumber: 'passport_number',
      passportIssuedDate: 'passport_issued_date',
      passportExpiryDate: 'passport_expiry_date',
      passportIssuingCountry: 'passport_issuing_country',
      visaType: 'visa_type',
      visaNumber: 'visa_number',
      visaExpiryDate: 'visa_expiry_date',
      driverLicenseNumber: 'driver_license_number',
      driverLicenseIssuedDate: 'driver_license_issued_date',
      driverLicenseExpiryDate: 'driver_license_expiry_date',
      driverLicenseIssuingCountry: 'driver_license_issuing_country',
      secondaryAddress: 'sec_address',
      secondaryCity: 'sec_city',
      secondaryPostalCode: 'sec_postal_code',
      secondaryCountry: 'sec_country',
      twitterUrl: 'twitter_url',
      facebookUrl: 'facebook_url',
      instagramUrl: 'instagram_url',
      pinterestUrl: 'pinterest_url',
      githubUrl: 'github_url',
      behanceUrl: 'behance_url',
      skypeName: 'skype_name',
      shirtSize: 'shirt_size',
      tShirtSize: 't_shirt_size',
      allergies: 'allergies'
    };

    for (let [inputKey, apiKey] of Object.entries(fieldMap)) {
      let value = ctx.input[inputKey as keyof typeof ctx.input];
      if (value !== undefined) {
        data[apiKey] =
          ['shirtSize', 'tShirtSize', 'reportsToEmployeeId'].includes(inputKey) &&
          typeof value === 'string'
            ? providerId(value, inputKey)
            : value;
      }
    }

    if (ctx.input.emergencyContact) {
      let ec: Record<string, unknown> = {};
      if (ctx.input.emergencyContact.fullName !== undefined)
        ec.full_name = ctx.input.emergencyContact.fullName;
      if (ctx.input.emergencyContact.relationshipTypeId !== undefined)
        ec.relationship_type_id = providerId(
          ctx.input.emergencyContact.relationshipTypeId,
          'emergencyContact.relationshipTypeId'
        );
      if (ctx.input.emergencyContact.phone !== undefined)
        ec.phone = ctx.input.emergencyContact.phone;
      if (ctx.input.emergencyContact.address !== undefined)
        ec.address = ctx.input.emergencyContact.address;
      if (Object.keys(ec).length > 0) {
        data.emergency_contact = ec;
      }
    }

    let response = await client.updateEmployee(ctx.input.employeeId, data);

    return {
      output: {
        employeeId: ctx.input.employeeId,
        rawResponse: response
      },
      message: `Successfully updated employee **${ctx.input.employeeId}**.`
    };
  })
  .build();

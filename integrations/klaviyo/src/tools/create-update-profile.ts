import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createUpdateProfile = SlateTool.create(spec, {
  name: 'Create or Update Profile',
  key: 'create_update_profile',
  description: `Create a new customer profile or update an existing one in Klaviyo.
When a profileId is provided, the existing profile will be updated. Otherwise a new profile is created.
Supports setting email, phone, name, location, and custom properties.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      profileId: z
        .string()
        .optional()
        .describe('Existing profile ID to update. Omit to create a new profile.'),
      email: z.string().optional().describe('Email address'),
      phoneNumber: z
        .string()
        .optional()
        .describe('Phone number in E.164 format (e.g., +15551234567)'),
      externalId: z.string().optional().describe('External identifier from another system'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      organization: z.string().optional().describe('Organization name'),
      title: z.string().optional().describe('Job title'),
      image: z.string().optional().describe('URL to profile image'),
      location: z
        .object({
          address1: z.string().optional(),
          address2: z.string().optional(),
          city: z.string().optional(),
          region: z.string().optional(),
          zip: z.string().optional(),
          country: z.string().optional(),
          latitude: z.number().optional(),
          longitude: z.number().optional(),
          timezone: z.string().optional()
        })
        .optional()
        .describe('Location data'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom properties to set on the profile')
    })
  )
  .output(
    z.object({
      profileId: z.string().describe('Profile ID'),
      email: z.string().optional().describe('Email address'),
      phoneNumber: z.string().optional().describe('Phone number'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      created: z.string().optional().describe('Profile creation timestamp'),
      updated: z.string().optional().describe('Profile last updated timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let attributes: Record<string, any> = {};
    if (ctx.input.email !== undefined) attributes.email = ctx.input.email;
    if (ctx.input.phoneNumber !== undefined) attributes.phone_number = ctx.input.phoneNumber;
    if (ctx.input.externalId !== undefined) attributes.external_id = ctx.input.externalId;
    if (ctx.input.firstName !== undefined) attributes.first_name = ctx.input.firstName;
    if (ctx.input.lastName !== undefined) attributes.last_name = ctx.input.lastName;
    if (ctx.input.organization !== undefined) attributes.organization = ctx.input.organization;
    if (ctx.input.title !== undefined) attributes.title = ctx.input.title;
    if (ctx.input.image !== undefined) attributes.image = ctx.input.image;
    if (ctx.input.location) attributes.location = ctx.input.location;
    if (ctx.input.properties) attributes.properties = ctx.input.properties;

    let result: any;
    let isUpdate = !!ctx.input.profileId;

    if (isUpdate) {
      result = await client.updateProfile(ctx.input.profileId!, attributes);
    } else {
      result = await client.createProfile(attributes);
    }

    let profile = Array.isArray(result.data) ? result.data[0] : result.data;

    return {
      output: {
        profileId: profile?.id ?? '',
        email: profile?.attributes?.email ?? undefined,
        phoneNumber: profile?.attributes?.phone_number ?? undefined,
        firstName: profile?.attributes?.first_name ?? undefined,
        lastName: profile?.attributes?.last_name ?? undefined,
        created: profile?.attributes?.created ?? undefined,
        updated: profile?.attributes?.updated ?? undefined
      },
      message: isUpdate
        ? `Updated profile **${profile?.id}**`
        : `Created profile **${profile?.id}**${profile?.attributes?.email ? ` (${profile.attributes.email})` : ''}`
    };
  })
  .build();

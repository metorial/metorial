import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let prospectFieldsSchema = z.object({
  businessName: z.string().optional().describe('Company or business name (max 255 chars)'),
  businessAddress: z.string().optional().describe('Business address (max 255 chars)'),
  businessPhone: z.string().optional().describe('Business phone number (max 255 chars)'),
  email: z.string().optional().describe('Contact email address'),
  website: z.string().optional().describe('Company website URL'),
  category: z.string().optional().describe('Business category (max 255 chars)'),
  logo: z.string().optional().describe('Business logo as a URL or base64-encoded image'),
  phone: z.string().optional().describe('Personal phone number (max 255 chars)'),
  firstName: z.string().optional().describe('First name (max 255 chars)'),
  lastName: z.string().optional().describe('Last name (max 255 chars)'),
  title: z.string().optional().describe('Honorific title, e.g. Mr., Ms. (max 255 chars)'),
  jobTitle: z.string().optional().describe('Job title (max 255 chars)'),
  gender: z.enum(['male', 'female']).optional().describe('Gender'),
  profileImage: z
    .string()
    .optional()
    .describe('Profile image as a URL or base64-encoded image'),
  lat: z.string().optional().describe('Latitude coordinate'),
  long: z.string().optional().describe('Longitude coordinate'),
  customImage1: z
    .string()
    .optional()
    .describe('Custom image 1 as a URL or base64-encoded image'),
  customImage2: z
    .string()
    .optional()
    .describe('Custom image 2 as a URL or base64-encoded image'),
  customImage3: z
    .string()
    .optional()
    .describe('Custom image 3 as a URL or base64-encoded image')
});

let toApiFields = (fields: z.infer<typeof prospectFieldsSchema>): Record<string, unknown> => {
  let result: Record<string, unknown> = {};
  if (fields.businessName !== undefined) result.business_name = fields.businessName;
  if (fields.businessAddress !== undefined) result.business_address = fields.businessAddress;
  if (fields.businessPhone !== undefined) result.business_phone = fields.businessPhone;
  if (fields.email !== undefined) result.email = fields.email;
  if (fields.website !== undefined) result.website = fields.website;
  if (fields.category !== undefined) result.category = fields.category;
  if (fields.logo !== undefined) result.logo = fields.logo;
  if (fields.phone !== undefined) result.phone = fields.phone;
  if (fields.firstName !== undefined) result.first_name = fields.firstName;
  if (fields.lastName !== undefined) result.last_name = fields.lastName;
  if (fields.title !== undefined) result.title = fields.title;
  if (fields.jobTitle !== undefined) result.job_title = fields.jobTitle;
  if (fields.gender !== undefined) result.gender = fields.gender;
  if (fields.profileImage !== undefined) result.profile_image = fields.profileImage;
  if (fields.lat !== undefined) result.lat = fields.lat;
  if (fields.long !== undefined) result.long = fields.long;
  if (fields.customImage1 !== undefined) result.custom_image_1 = fields.customImage1;
  if (fields.customImage2 !== undefined) result.custom_image_2 = fields.customImage2;
  if (fields.customImage3 !== undefined) result.custom_image_3 = fields.customImage3;
  return result;
};

export let createProspect = SlateTool.create(spec, {
  name: 'Create Prospect',
  key: 'create_prospect',
  description: `Create a new business prospect record in Hyperise. The returned record ID can be used to apply prospect data to any Hyperise image template for personalization. Required fields are **businessName**, **email**, and **website**.`,
  instructions: [
    'The businessName, email, and website fields are required by the Hyperise API.',
    'Logo and profileImage accept either a URL or a base64-encoded image string.'
  ]
})
  .input(prospectFieldsSchema)
  .output(
    z
      .object({
        prospectId: z.string().describe('Unique ID of the created prospect record'),
        businessName: z.string().optional().describe('Business name'),
        email: z.string().optional().describe('Email address'),
        website: z.string().optional().describe('Website URL')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let apiData = toApiFields(ctx.input);
    let result = await client.createProspect(apiData);

    let prospect = result?.data ?? result;

    return {
      output: {
        prospectId: (prospect.id ?? prospect.record_id)?.toString(),
        businessName: prospect.business_name,
        email: prospect.email,
        website: prospect.website,
        ...prospect
      },
      message: `Created prospect **${prospect.business_name || prospect.email || prospect.id}**.`
    };
  })
  .build();

export let updateProspect = SlateTool.create(spec, {
  name: 'Update Prospect',
  key: 'update_prospect',
  description: `Update an existing business prospect record in Hyperise. Provide the prospect ID and any fields to update. Only the specified fields will be changed.`
})
  .input(
    z
      .object({
        prospectId: z.string().describe('ID of the prospect record to update')
      })
      .merge(prospectFieldsSchema)
  )
  .output(
    z
      .object({
        prospectId: z.string().describe('ID of the updated prospect record'),
        businessName: z.string().optional().describe('Business name'),
        email: z.string().optional().describe('Email address'),
        website: z.string().optional().describe('Website URL')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { prospectId, ...fields } = ctx.input;
    let apiData = toApiFields(fields);
    let result = await client.updateProspect(prospectId, apiData);

    let prospect = result?.data ?? result;

    return {
      output: {
        prospectId: (prospect.id ?? prospectId)?.toString(),
        businessName: prospect.business_name,
        email: prospect.email,
        website: prospect.website,
        ...prospect
      },
      message: `Updated prospect **${prospect.business_name || prospect.email || prospectId}**.`
    };
  })
  .build();

export let deleteProspect = SlateTool.create(spec, {
  name: 'Delete Prospect',
  key: 'delete_prospect',
  description: `Delete a business prospect record from Hyperise by its ID. This action is irreversible.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      prospectId: z.string().describe('ID of the prospect record to delete')
    })
  )
  .output(
    z.object({
      prospectId: z.string().describe('ID of the deleted prospect'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteProspect(ctx.input.prospectId);

    return {
      output: {
        prospectId: ctx.input.prospectId,
        deleted: true
      },
      message: `Deleted prospect **${ctx.input.prospectId}**.`
    };
  })
  .build();

export let getProspect = SlateTool.create(spec, {
  name: 'Get Prospect',
  key: 'get_prospect',
  description: `Retrieve a single business prospect record from Hyperise by its ID. Returns the full prospect profile including business details, personal information, and image URLs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      prospectId: z.string().describe('ID of the prospect record to retrieve')
    })
  )
  .output(
    z
      .object({
        prospectId: z.string().describe('Unique ID of the prospect record'),
        businessName: z.string().optional().describe('Business name'),
        email: z.string().optional().describe('Email address'),
        website: z.string().optional().describe('Website URL'),
        firstName: z.string().optional().describe('First name'),
        lastName: z.string().optional().describe('Last name'),
        jobTitle: z.string().optional().describe('Job title')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getProspect(ctx.input.prospectId);

    let prospect = result?.data ?? result;

    return {
      output: {
        prospectId: (prospect.id ?? ctx.input.prospectId)?.toString(),
        businessName: prospect.business_name,
        email: prospect.email,
        website: prospect.website,
        firstName: prospect.first_name,
        lastName: prospect.last_name,
        jobTitle: prospect.job_title,
        ...prospect
      },
      message: `Retrieved prospect **${prospect.business_name || prospect.email || ctx.input.prospectId}**.`
    };
  })
  .build();

export let listProspects = SlateTool.create(spec, {
  name: 'List Prospects',
  key: 'list_prospects',
  description: `List all business prospect records in the Hyperise account. Returns prospect IDs, names, emails, and other stored profile data.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      prospects: z
        .array(
          z
            .object({
              prospectId: z.string().describe('Unique ID of the prospect record'),
              businessName: z.string().optional().describe('Business name'),
              email: z.string().optional().describe('Email address'),
              firstName: z.string().optional().describe('First name'),
              lastName: z.string().optional().describe('Last name')
            })
            .passthrough()
        )
        .describe('List of prospect records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let data = await client.listProspects();

    let prospects = Array.isArray(data) ? data : (data?.data ?? []);

    let mapped = prospects.map((p: any) => ({
      prospectId: (p.id ?? p.record_id)?.toString(),
      businessName: p.business_name,
      email: p.email,
      firstName: p.first_name,
      lastName: p.last_name,
      ...p
    }));

    return {
      output: { prospects: mapped },
      message: `Found **${mapped.length}** prospect(s).`
    };
  })
  .build();

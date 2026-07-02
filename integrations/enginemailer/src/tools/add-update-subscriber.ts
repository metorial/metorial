import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addUpdateSubscriber = SlateTool.create(spec, {
  name: 'Add or Update Subscriber',
  key: 'add_update_subscriber',
  description: `Add a new subscriber or update an existing one in Enginemailer. Provide the subscriber's email along with optional subcategories, custom fields, and source type. If the subscriber already exists, their data will be updated according to the specified update type.`,
  instructions: [
    'Use **updateType** to control how existing data is handled: "Overwrite" replaces all data, "Append" adds subcategories without removing existing ones, "Ignore" preserves existing data.',
    'Custom fields must use the exact field key as configured in your Enginemailer account.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the subscriber'),
      subcategories: z
        .array(z.string())
        .optional()
        .describe('List of subcategory IDs to assign the subscriber to'),
      customFields: z
        .array(
          z.object({
            key: z.string().describe('Custom field key'),
            value: z.string().describe('Custom field value')
          })
        )
        .optional()
        .describe('Custom field key-value pairs'),
      sourceType: z
        .string()
        .optional()
        .describe('Source of the subscriber, e.g. "Signup from website"'),
      updateType: z
        .enum(['Overwrite', 'Append', 'Ignore'])
        .optional()
        .default('Overwrite')
        .describe('How to handle existing data when updating')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status'),
      statusCode: z.string().describe('Response status code'),
      message: z.string().optional().describe('Response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let customfields = ctx.input.customFields?.map(f => ({
      customfield_key: f.key,
      customfield_value: f.value
    }));

    // Try to get subscriber first to determine if insert or update
    let isExisting = false;
    try {
      let existing = await client.getSubscriber(ctx.input.email);
      if (existing?.Result?.StatusCode === '200' || existing?.Result?.Status === 'OK') {
        isExisting = true;
      }
    } catch {
      // Subscriber doesn't exist, proceed with insert
    }

    let result: any;
    if (isExisting) {
      result = await client.updateSubscriber({
        email: ctx.input.email,
        subcategories: ctx.input.subcategories,
        subcategories_type: ctx.input.updateType,
        customfields,
        customfield_type: ctx.input.updateType
      });
    } else {
      result = await client.insertSubscriber({
        email: ctx.input.email,
        subcategories: ctx.input.subcategories,
        customfields,
        sourcetype: ctx.input.sourceType
      });
    }

    return {
      output: {
        status: result.Result?.Status ?? 'Unknown',
        statusCode: result.Result?.StatusCode ?? 'Unknown',
        message: result.Result?.Message ?? result.Result?.ErrorMessage
      },
      message: isExisting
        ? `Updated subscriber **${ctx.input.email}** successfully.`
        : `Added new subscriber **${ctx.input.email}** successfully.`
    };
  })
  .build();

import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCustomFieldDefinitions = SlateTool.create(spec, {
  name: 'List Custom Field Definitions',
  key: 'list_custom_field_definitions',
  description: `List all custom field definitions in the Copper account. Returns field names, types, and available options for dropdown/multi-select fields. Use this to discover custom field IDs for creating or updating records.`,
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      customFields: z
        .array(
          z.object({
            customFieldDefinitionId: z.number().describe('Custom field definition ID'),
            name: z.string().describe('Field name'),
            dataType: z.string().describe('Field data type'),
            availableOn: z
              .array(z.string())
              .optional()
              .describe('Entity types this field is available on'),
            options: z
              .array(z.any())
              .optional()
              .describe('Available options (for dropdown/multi-select fields)')
          })
        )
        .describe('Custom field definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let fields = await client.listCustomFieldDefinitions();

    return {
      output: {
        customFields: fields.map((f: any) => ({
          customFieldDefinitionId: f.id,
          name: f.name,
          dataType: f.data_type,
          availableOn: f.available_on,
          options: f.options
        }))
      },
      message: `Retrieved **${fields.length}** custom field definitions.`
    };
  })
  .build();

export let listContactTypes = SlateTool.create(spec, {
  name: 'List Contact Types',
  key: 'list_contact_types',
  description: `List all contact types available in the Copper account. Contact types categorize people and companies (e.g., "Customer", "Partner", "Vendor").`,
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      contactTypes: z
        .array(
          z.object({
            contactTypeId: z.number().describe('Contact type ID'),
            name: z.string().describe('Contact type name')
          })
        )
        .describe('Available contact types')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let types = await client.listContactTypes();

    return {
      output: {
        contactTypes: types.map((t: any) => ({
          contactTypeId: t.id,
          name: t.name
        }))
      },
      message: `Retrieved **${types.length}** contact types.`
    };
  })
  .build();

export let listCustomerSources = SlateTool.create(spec, {
  name: 'List Customer Sources',
  key: 'list_customer_sources',
  description: `List all customer sources available in the Copper account. Customer sources track how leads and opportunities were acquired (e.g., "Referral", "Website", "Cold Call").`,
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      customerSources: z
        .array(
          z.object({
            customerSourceId: z.number().describe('Customer source ID'),
            name: z.string().describe('Customer source name')
          })
        )
        .describe('Available customer sources')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let sources = await client.listCustomerSources();

    return {
      output: {
        customerSources: sources.map((s: any) => ({
          customerSourceId: s.id,
          name: s.name
        }))
      },
      message: `Retrieved **${sources.length}** customer sources.`
    };
  })
  .build();

export let listLossReasons = SlateTool.create(spec, {
  name: 'List Loss Reasons',
  key: 'list_loss_reasons',
  description: `List all loss reasons available in the Copper account. Loss reasons are used when marking opportunities as lost.`,
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      lossReasons: z
        .array(
          z.object({
            lossReasonId: z.number().describe('Loss reason ID'),
            name: z.string().describe('Loss reason name')
          })
        )
        .describe('Available loss reasons')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let reasons = await client.listLossReasons();

    return {
      output: {
        lossReasons: reasons.map((r: any) => ({
          lossReasonId: r.id,
          name: r.name
        }))
      },
      message: `Retrieved **${reasons.length}** loss reasons.`
    };
  })
  .build();

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List all users in the Copper account. Returns user names, emails, and IDs which can be used when assigning records.`,
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.number().describe('User ID'),
            name: z.string().describe('User display name'),
            email: z.string().describe('User email address')
          })
        )
        .describe('Users in the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let users = await client.listUsers();

    return {
      output: {
        users: users.map((u: any) => ({
          userId: u.id,
          name: u.name,
          email: u.email
        }))
      },
      message: `Retrieved **${users.length}** users.`
    };
  })
  .build();

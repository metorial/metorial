import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshdeskClient } from '../lib/client';
import { spec } from '../spec';

let fieldSchema = z.object({
  fieldId: z.number().describe('Field ID'),
  name: z.string().nullable().describe('API field name'),
  label: z.string().nullable().describe('Display label'),
  type: z.string().nullable().describe('Field type'),
  requiredForAgents: z.boolean().nullable().describe('Whether agents must provide this field'),
  requiredForCustomers: z
    .boolean()
    .nullable()
    .describe('Whether customers must provide this field'),
  choices: z.any().nullable().describe('Configured dropdown choices or nested choices')
});

let mapField = (field: any) => ({
  fieldId: field.id,
  name: field.name ?? null,
  label: field.label ?? field.label_for_customers ?? null,
  type: field.type ?? null,
  requiredForAgents: field.required_for_agents ?? null,
  requiredForCustomers: field.required_for_customers ?? null,
  choices: field.choices ?? null
});

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieves Freshdesk account details for the connected helpdesk, including plan and portal metadata when available.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      account: z.record(z.string(), z.any()).describe('Freshdesk account metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let account = await client.getAccount();

    return {
      output: { account },
      message: `Retrieved Freshdesk account metadata`
    };
  })
  .build();

export let getCurrentAgent = SlateTool.create(spec, {
  name: 'Get Current Agent',
  key: 'get_current_agent',
  description: `Retrieves the currently authenticated Freshdesk agent. Use this to discover the agent ID for assignment, time entry ownership, and E2E setup.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      agentId: z.number().describe('Authenticated agent ID'),
      contactId: z.number().nullable().describe('Associated contact ID'),
      name: z.string().nullable().describe('Agent display name'),
      email: z.string().nullable().describe('Agent email address'),
      active: z.boolean().describe('Whether the agent is active'),
      occasional: z.boolean().describe('Whether the agent is an occasional agent'),
      ticketScope: z.number().nullable().describe('Ticket scope value'),
      groupIds: z.array(z.number()).describe('Groups the agent belongs to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let agent = await client.getCurrentAgent();

    return {
      output: {
        agentId: agent.id,
        contactId: agent.contact?.id ?? agent.contact_id ?? null,
        name: agent.contact?.name ?? null,
        email: agent.contact?.email ?? null,
        active: agent.available ?? agent.active ?? true,
        occasional: agent.occasional ?? false,
        ticketScope: agent.ticket_scope ?? null,
        groupIds: agent.group_ids ?? []
      },
      message: `Retrieved current Freshdesk agent **#${agent.id}**`
    };
  })
  .build();

export let listFields = SlateTool.create(spec, {
  name: 'List Fields',
  key: 'list_fields',
  description: `Lists Freshdesk field definitions for tickets, contacts, or companies. Use this before writing custom fields or validating required helpdesk fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resource: z
        .enum(['ticket', 'contact', 'company'])
        .describe('Field resource to list: ticket, contact, or company')
    })
  )
  .output(
    z.object({
      resource: z.enum(['ticket', 'contact', 'company']).describe('Field resource listed'),
      fields: z.array(fieldSchema).describe('Field definitions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let fields =
      ctx.input.resource === 'ticket'
        ? await client.listTicketFields()
        : ctx.input.resource === 'contact'
          ? await client.listContactFields()
          : await client.listCompanyFields();
    let mapped = fields.map(mapField);

    return {
      output: {
        resource: ctx.input.resource,
        fields: mapped
      },
      message: `Retrieved **${mapped.length}** ${ctx.input.resource} fields`
    };
  })
  .build();

export let listProducts = SlateTool.create(spec, {
  name: 'List Products',
  key: 'list_products',
  description: `Lists Freshdesk products configured for the helpdesk. Use product IDs when creating or routing product-specific tickets.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      products: z
        .array(
          z.object({
            productId: z.number().describe('Product ID'),
            name: z.string().describe('Product name'),
            description: z.string().nullable().describe('Product description'),
            primary: z.boolean().nullable().describe('Whether this is the primary product'),
            createdAt: z.string().nullable().describe('Creation timestamp'),
            updatedAt: z.string().nullable().describe('Last update timestamp')
          })
        )
        .describe('Products')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let products = await client.listProducts();
    let mapped = products.map((product: any) => ({
      productId: product.id,
      name: product.name,
      description: product.description ?? null,
      primary: product.primary ?? null,
      createdAt: product.created_at ?? null,
      updatedAt: product.updated_at ?? null
    }));

    return {
      output: { products: mapped },
      message: `Retrieved **${mapped.length}** products`
    };
  })
  .build();

export let listBusinessHours = SlateTool.create(spec, {
  name: 'List Business Hours',
  key: 'list_business_hours',
  description: `Lists Freshdesk business-hour schedules used by SLA policies and ticket due dates.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      businessHours: z
        .array(
          z.object({
            businessHourId: z.number().describe('Business hour ID'),
            name: z.string().describe('Business hour name'),
            description: z.string().nullable().describe('Description'),
            timeZone: z.string().nullable().describe('Time zone'),
            isDefault: z.boolean().nullable().describe('Whether this is the default schedule')
          })
        )
        .describe('Business-hour schedules')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let businessHours = await client.listBusinessHours();
    let mapped = businessHours.map((item: any) => ({
      businessHourId: item.id,
      name: item.name,
      description: item.description ?? null,
      timeZone: item.time_zone ?? item.timezone ?? null,
      isDefault: item.default ?? item.is_default ?? null
    }));

    return {
      output: { businessHours: mapped },
      message: `Retrieved **${mapped.length}** business-hour schedules`
    };
  })
  .build();

export let listSlaPolicies = SlateTool.create(spec, {
  name: 'List SLA Policies',
  key: 'list_sla_policies',
  description: `Lists Freshdesk SLA policies. Use this to inspect support targets and escalation policies that affect ticket due dates.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      slaPolicies: z
        .array(
          z.object({
            slaPolicyId: z.number().describe('SLA policy ID'),
            name: z.string().describe('Policy name'),
            active: z.boolean().nullable().describe('Whether the policy is active'),
            position: z.number().nullable().describe('Policy position'),
            isDefault: z.boolean().nullable().describe('Whether this is the default policy')
          })
        )
        .describe('SLA policies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let policies = await client.listSlaPolicies();
    let mapped = policies.map((policy: any) => ({
      slaPolicyId: policy.id,
      name: policy.name,
      active: policy.active ?? null,
      position: policy.position ?? null,
      isDefault: policy.default ?? policy.is_default ?? null
    }));

    return {
      output: { slaPolicies: mapped },
      message: `Retrieved **${mapped.length}** SLA policies`
    };
  })
  .build();

export let getHelpdeskSettings = SlateTool.create(spec, {
  name: 'Get Helpdesk Settings',
  key: 'get_helpdesk_settings',
  description: `Retrieves Freshdesk helpdesk-level settings, including locale and portal behavior metadata when available.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      settings: z.record(z.string(), z.any()).describe('Helpdesk settings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let settings = await client.getHelpdeskSettings();

    return {
      output: { settings },
      message: `Retrieved Freshdesk helpdesk settings`
    };
  })
  .build();

export let listSatisfactionRatings = SlateTool.create(spec, {
  name: 'List Satisfaction Ratings',
  key: 'list_satisfaction_ratings',
  description: `Lists Freshdesk satisfaction ratings across tickets, with optional created-date filters for reporting and customer support quality review.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      createdSince: z
        .string()
        .optional()
        .describe('Return ratings created after this ISO 8601 timestamp'),
      createdUntil: z
        .string()
        .optional()
        .describe('Return ratings created before this ISO 8601 timestamp'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      ratings: z
        .array(
          z.object({
            ratingId: z.number().describe('Satisfaction rating ID'),
            ticketId: z.number().nullable().describe('Ticket ID'),
            requesterId: z.number().nullable().describe('Requester contact ID'),
            agentId: z.number().nullable().describe('Agent ID'),
            groupId: z.number().nullable().describe('Group ID'),
            score: z.any().nullable().describe('Rating score or choice'),
            feedback: z.string().nullable().describe('Requester feedback'),
            createdAt: z.string().nullable().describe('Creation timestamp'),
            updatedAt: z.string().nullable().describe('Last update timestamp')
          })
        )
        .describe('Satisfaction ratings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let ratings = await client.listSatisfactionRatings({
      createdSince: ctx.input.createdSince,
      createdUntil: ctx.input.createdUntil,
      page: ctx.input.page
    });
    let mapped = ratings.map((rating: any) => ({
      ratingId: rating.id,
      ticketId: rating.ticket_id ?? null,
      requesterId: rating.requester_id ?? null,
      agentId: rating.agent_id ?? null,
      groupId: rating.group_id ?? null,
      score: rating.rating ?? rating.score ?? null,
      feedback: rating.feedback ?? null,
      createdAt: rating.created_at ?? null,
      updatedAt: rating.updated_at ?? null
    }));

    return {
      output: { ratings: mapped },
      message: `Retrieved **${mapped.length}** satisfaction ratings`
    };
  })
  .build();

export let listCannedResponseFolders = SlateTool.create(spec, {
  name: 'List Canned Response Folders',
  key: 'list_canned_response_folders',
  description: `Lists folders that organize Freshdesk canned responses for agent replies.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      folders: z
        .array(
          z.object({
            folderId: z.number().describe('Folder ID'),
            name: z.string().describe('Folder name'),
            personal: z.boolean().nullable().describe('Whether this is a personal folder')
          })
        )
        .describe('Canned response folders')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let folders = await client.listCannedResponseFolders();
    let mapped = folders.map((folder: any) => ({
      folderId: folder.id,
      name: folder.name,
      personal: folder.personal ?? null
    }));

    return {
      output: { folders: mapped },
      message: `Retrieved **${mapped.length}** canned response folders`
    };
  })
  .build();

export let listCannedResponses = SlateTool.create(spec, {
  name: 'List Canned Responses',
  key: 'list_canned_responses',
  description: `Lists canned responses in a Freshdesk canned response folder so agents can reuse approved reply templates.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      folderId: z.number().describe('ID of the canned response folder')
    })
  )
  .output(
    z.object({
      responses: z
        .array(
          z.object({
            responseId: z.number().describe('Canned response ID'),
            title: z.string().nullable().describe('Response title'),
            content: z.string().nullable().describe('HTML response content')
          })
        )
        .describe('Canned responses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let responses = await client.listCannedResponses(ctx.input.folderId);
    let mapped = responses.map((response: any) => ({
      responseId: response.id,
      title: response.title ?? response.name ?? null,
      content: response.content ?? response.body ?? null
    }));

    return {
      output: { responses: mapped },
      message: `Retrieved **${mapped.length}** canned responses`
    };
  })
  .build();

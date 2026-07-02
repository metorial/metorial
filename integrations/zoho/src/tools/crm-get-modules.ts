import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZohoCrmClient } from '../lib/client';
import type { Datacenter } from '../lib/urls';
import { spec } from '../spec';

export let crmGetModules = SlateTool.create(spec, {
  name: 'CRM Get Modules',
  key: 'crm_get_modules',
  description: `List all available modules in Zoho CRM along with their metadata. Returns module API names, labels, capabilities (creatable, viewable, editable, deletable), and status. Also supports listing CRM users.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .string()
        .optional()
        .describe('Filter modules by status, e.g. "visible" or "user_hidden,system_hidden"'),
      includeUsers: z.boolean().optional().describe('Also fetch and include CRM user list'),
      userType: z
        .string()
        .optional()
        .describe('Filter users by type (e.g., "AllUsers", "ActiveUsers", "AdminUsers")')
    })
  )
  .output(
    z.object({
      modules: z
        .array(
          z.object({
            moduleId: z.string().optional(),
            apiName: z.string(),
            pluralLabel: z.string().optional(),
            singularLabel: z.string().optional(),
            creatable: z.boolean().optional(),
            viewable: z.boolean().optional(),
            editable: z.boolean().optional(),
            deletable: z.boolean().optional(),
            apiSupported: z.boolean().optional()
          })
        )
        .describe('Available CRM modules'),
      users: z
        .array(
          z.object({
            userId: z.string().optional(),
            fullName: z.string().optional(),
            email: z.string().optional(),
            role: z.string().optional(),
            status: z.string().optional()
          })
        )
        .optional()
        .describe('CRM users (if includeUsers is true)')
    })
  )
  .handleInvocation(async ctx => {
    let dc = (ctx.auth.datacenter || ctx.config.datacenter || 'us') as Datacenter;
    let client = new ZohoCrmClient({ token: ctx.auth.token, datacenter: dc });

    let modulesResult = await client.getModules({ status: ctx.input.status });
    let modules = (modulesResult?.modules || []).map((m: any) => ({
      moduleId: m.id,
      apiName: m.api_name,
      pluralLabel: m.plural_label,
      singularLabel: m.singular_label,
      creatable: m.creatable,
      viewable: m.viewable,
      editable: m.editable,
      deletable: m.deletable,
      apiSupported: m.api_supported
    }));

    let users: any[] | undefined;
    if (ctx.input.includeUsers) {
      let usersResult = await client.getUsers({ type: ctx.input.userType });
      users = (usersResult?.users || []).map((u: any) => ({
        userId: u.id,
        fullName: u.full_name,
        email: u.email,
        role: u.role?.name,
        status: u.status
      }));
    }

    return {
      output: { modules, users },
      message: `Found **${modules.length}** CRM modules${users ? ` and **${users.length}** users` : ''}.`
    };
  })
  .build();

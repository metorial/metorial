import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listIncidentRolesAndTypes = SlateTool.create(spec, {
  name: 'List Incident Roles & Types',
  key: 'list_incident_roles_and_types',
  description: `Retrieve all configured incident roles and incident types. Useful for looking up valid IDs when creating or editing incidents, and understanding how incidents are categorized.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      roles: z.array(
        z.object({
          roleId: z.string(),
          name: z.string(),
          description: z.string().optional(),
          required: z.boolean().optional(),
          shortform: z.string().optional()
        })
      ),
      incidentTypes: z.array(
        z.object({
          incidentTypeId: z.string(),
          name: z.string(),
          description: z.string().optional(),
          isDefault: z.boolean().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let [rolesResult, typesResult] = await Promise.all([
      client.listIncidentRoles(),
      client.listIncidentTypes()
    ]);

    let roles = rolesResult.incident_roles.map((r: any) => ({
      roleId: r.id,
      name: r.name,
      description: r.description || undefined,
      required: r.required ?? undefined,
      shortform: r.shortform || undefined
    }));

    let incidentTypes = typesResult.incident_types.map((t: any) => ({
      incidentTypeId: t.id,
      name: t.name,
      description: t.description || undefined,
      isDefault: t.is_default ?? undefined
    }));

    return {
      output: { roles, incidentTypes },
      message: `Found **${roles.length}** role(s) and **${incidentTypes.length}** incident type(s).`
    };
  })
  .build();

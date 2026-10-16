import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { CincopaClient } from '../lib/client';
import { requireSuccess } from '../lib/response';
import { spec } from '../spec';

export let managePortalSubdomain = SlateTool.create(spec, {
  key: 'manage_portal_subdomain',
  name: 'Manage Portal Subdomain',
  description:
    'Check availability, save portal settings, rename a subdomain, or remove a portal using Cincopa’s documented subdomain API.',
  instructions: [
    'Use check before choosing a new subdomain. Use manage_portal with list to discover existing portals.',
    'For rename, subdomain is the existing name and newSubdomain is the new name.',
    'For save, provide the portal template, JSON settings, and access settings to update. Removing a portal is permanent.'
  ],
  tags: { destructive: true }
})
  .input(
    z.object({
      action: z.enum(['check', 'save', 'rename', 'remove']),
      subdomain: z.string(),
      newSubdomain: z.string().optional().describe('New subdomain for rename'),
      template: z.string().optional().describe('Portal template for save'),
      args: z.string().optional().describe('Portal settings as a JSON string for save'),
      allowPublic: z.boolean().optional().describe('Allow public access for save'),
      requireCincopaLogin: z.boolean().optional().describe('Require a Cincopa login for save'),
      registration: z
        .string()
        .optional()
        .describe('Cincopa login registration setting for save, such as restricted'),
      cnameDomain: z.string().optional().describe('Custom domain for save')
    })
  )
  .output(z.object({ success: z.boolean(), availability: z.string().optional() }))
  .handleInvocation(async ctx => {
    let input = ctx.input;
    if (input.action === 'rename' && !input.newSubdomain) {
      throw createApiServiceError('newSubdomain is required to rename a portal.');
    }
    let fields =
      input.action === 'rename'
        ? { from: input.subdomain, to: input.newSubdomain }
        : input.action === 'save'
          ? {
              subdomain: input.subdomain,
              template: input.template,
              args: input.args,
              allow_public:
                input.allowPublic === undefined ? undefined : input.allowPublic ? 'yes' : 'no',
              cincopa_login:
                input.requireCincopaLogin === undefined
                  ? undefined
                  : input.requireCincopaLogin
                    ? 'yes'
                    : 'no',
              cincopa_login_registration: input.registration,
              cname_domain: input.cnameDomain
            }
          : { subdomain: input.subdomain };
    let data = await new CincopaClient(ctx.auth).portalSubdomain(input.action, fields);
    return {
      output: {
        success: requireSuccess(data),
        availability: input.action === 'check' ? data.subdomain : undefined
      },
      message: 'Completed the portal subdomain request.'
    };
  })
  .build();

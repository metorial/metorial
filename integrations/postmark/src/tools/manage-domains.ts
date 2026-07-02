import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type DomainRecord } from '../lib/client';
import { requirePostmarkNumber, requirePostmarkString } from '../lib/errors';
import { spec } from '../spec';

let domainOutput = z.object({
  domainId: z.number().describe('Postmark domain ID.'),
  name: z.string().describe('Domain name.'),
  dkimVerified: z.boolean().optional().describe('Whether DKIM has been verified.'),
  weakDkim: z.boolean().optional().describe('Whether the active DKIM key is weak.'),
  dkimHost: z.string().optional().describe('Current DKIM DNS host.'),
  dkimTextValue: z.string().optional().describe('Current DKIM DNS TXT value.'),
  dkimPendingHost: z.string().optional().describe('Pending DKIM DNS host.'),
  dkimPendingTextValue: z.string().optional().describe('Pending DKIM DNS TXT value.'),
  dkimUpdateStatus: z.string().optional().describe('DKIM update status.'),
  returnPathDomain: z.string().optional().describe('Custom Return-Path domain.'),
  returnPathDomainVerified: z
    .boolean()
    .optional()
    .describe('Whether the Return-Path domain is verified.'),
  returnPathDomainCnameValue: z
    .string()
    .optional()
    .describe('Expected Return-Path CNAME value.')
});

let mapDomain = (domain: DomainRecord) => ({
  domainId: domain.ID,
  name: domain.Name,
  dkimVerified: domain.DKIMVerified,
  weakDkim: domain.WeakDKIM,
  dkimHost: domain.DKIMHost || undefined,
  dkimTextValue: domain.DKIMTextValue || undefined,
  dkimPendingHost: domain.DKIMPendingHost || undefined,
  dkimPendingTextValue: domain.DKIMPendingTextValue || undefined,
  dkimUpdateStatus: domain.DKIMUpdateStatus || undefined,
  returnPathDomain: domain.ReturnPathDomain || undefined,
  returnPathDomainVerified: domain.ReturnPathDomainVerified,
  returnPathDomainCnameValue: domain.ReturnPathDomainCNAMEValue || undefined
});

export let manageDomains = SlateTool.create(spec, {
  name: 'Manage Domains',
  key: 'manage_domains',
  description: `List, get, create, update, delete, and verify Postmark sending domains. Use this for domain setup, DKIM records, Return-Path records, and DKIM rotation. Requires an Account API Token.`,
  instructions: [
    'Set **action** to "list", "get", "create", "update", "delete", "verifyDkim", "verifyReturnPath", or "rotateDkim".',
    'For every action except "list" and "create", provide **domainId**.',
    'For "create", provide **name**. For "update", provide **returnPathDomain**.'
  ],
  constraints: [
    'Requires an Account API Token in addition to the Server API Token.',
    'SPF verification is intentionally omitted because Postmark marks that endpoint deprecated.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list',
          'get',
          'create',
          'update',
          'delete',
          'verifyDkim',
          'verifyReturnPath',
          'rotateDkim'
        ])
        .describe('Domain operation to perform.'),
      domainId: z.number().optional().describe('Postmark domain ID.'),
      name: z.string().optional().describe('Domain name for create.'),
      returnPathDomain: z
        .string()
        .optional()
        .describe('Custom Return-Path domain for create or update.'),
      count: z
        .number()
        .min(1)
        .max(500)
        .default(100)
        .describe('Number of domains to return for list.'),
      offset: z.number().min(0).default(0).describe('Offset for list pagination.')
    })
  )
  .output(
    z.object({
      totalCount: z.number().optional().describe('Total domains.'),
      domains: z.array(domainOutput).optional().describe('Domains returned by list.'),
      domain: domainOutput.optional().describe('Domain returned by the operation.'),
      deleted: z.boolean().optional().describe('Whether the domain was deleted.'),
      statusMessage: z.string().optional().describe('Postmark operation message.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountToken: ctx.auth.accountToken
    });

    if (ctx.input.action === 'list') {
      let result = await client.listDomains({
        count: ctx.input.count,
        offset: ctx.input.offset
      });

      return {
        output: {
          totalCount: result.TotalCount,
          domains: result.Domains.map(mapDomain)
        },
        message: `Found **${result.TotalCount}** Postmark domain(s).`
      };
    }

    if (ctx.input.action === 'create') {
      let name = requirePostmarkString(ctx.input.name, 'name', 'create');
      let domain = await client.createDomain({
        name,
        returnPathDomain: ctx.input.returnPathDomain
      });

      return {
        output: {
          domain: mapDomain(domain)
        },
        message: `Created Postmark domain **${domain.Name}** (ID: ${domain.ID}).`
      };
    }

    let domainId = requirePostmarkNumber(ctx.input.domainId, 'domainId', ctx.input.action);

    if (ctx.input.action === 'get') {
      let domain = await client.getDomain(domainId);
      return {
        output: {
          domain: mapDomain(domain)
        },
        message: `Retrieved Postmark domain **${domain.Name}** (ID: ${domain.ID}).`
      };
    }

    if (ctx.input.action === 'update') {
      requirePostmarkString(ctx.input.returnPathDomain, 'returnPathDomain', 'update');
      let domain = await client.editDomain(domainId, {
        returnPathDomain: ctx.input.returnPathDomain
      });

      return {
        output: {
          domain: mapDomain(domain)
        },
        message: `Updated Postmark domain **${domain.Name}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      let result = await client.deleteDomain(domainId);
      return {
        output: {
          deleted: true,
          statusMessage: result.Message
        },
        message: `Deleted Postmark domain **${domainId}**.`
      };
    }

    if (ctx.input.action === 'verifyDkim') {
      let domain = await client.verifyDomainDkim(domainId);
      return {
        output: {
          domain: mapDomain(domain)
        },
        message: `Requested DKIM verification for Postmark domain **${domain.Name}**.`
      };
    }

    if (ctx.input.action === 'verifyReturnPath') {
      let domain = await client.verifyDomainReturnPath(domainId);
      return {
        output: {
          domain: mapDomain(domain)
        },
        message: `Requested Return-Path verification for Postmark domain **${domain.Name}**.`
      };
    }

    let domain = await client.rotateDomainDkim(domainId);
    return {
      output: {
        domain: mapDomain(domain)
      },
      message: `Started DKIM rotation for Postmark domain **${domain.Name}**.`
    };
  });

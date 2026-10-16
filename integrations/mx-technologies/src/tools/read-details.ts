import { SlateTool } from 'slates';
import { z } from 'zod';
import { MxClient } from '../lib/client';
import { spec } from '../spec';
import { holdingSchema, mapHolding } from './list-holdings';
import { mapStatement, statementSchema } from './list-statements';
import { mapMember, memberSchema } from './manage-members';

export let readMember = SlateTool.create(spec, {
  name: 'Read Member',
  key: 'read_member',
  description:
    'Read the full financial institution connection, including its identifiers, connection status, and aggregation timestamps.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      userGuid: z.string().describe('MX GUID of the user'),
      memberGuid: z.string().describe('MX GUID of the member, from List Members')
    })
  )
  .output(
    memberSchema.extend({
      raw: z.record(z.string(), z.unknown()).optional().describe('Complete MX member record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    let member = await client.readMember(ctx.input.userGuid, ctx.input.memberGuid);
    return {
      output: { ...mapMember(member), raw: member },
      message: 'Retrieved the financial institution connection.'
    };
  })
  .build();

export let readHolding = SlateTool.create(spec, {
  name: 'Read Holding',
  key: 'read_holding',
  description:
    'Read an investment holding by its GUID, including quantity, value, price, and the complete available investment details.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      userGuid: z.string().describe('MX GUID of the user'),
      holdingGuid: z.string().describe('MX GUID of the holding, from List Holdings')
    })
  )
  .output(
    holdingSchema.extend({
      raw: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Complete MX investment holding record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    let holding = await client.readHolding(ctx.input.userGuid, ctx.input.holdingGuid);
    return {
      output: { ...mapHolding(holding), raw: holding },
      message: 'Retrieved the investment holding.'
    };
  })
  .build();

export let readStatement = SlateTool.create(spec, {
  name: 'Read Statement',
  key: 'read_statement',
  description:
    'Read statement metadata by GUID. Use Download Statement PDF to retrieve the document.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      userGuid: z.string().describe('MX GUID of the user'),
      memberGuid: z.string().describe('MX GUID of the member'),
      statementGuid: z.string().describe('MX GUID of the statement, from List Statements')
    })
  )
  .output(
    statementSchema.extend({
      raw: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Complete MX statement metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    let statement = await client.readStatement(
      ctx.input.userGuid,
      ctx.input.memberGuid,
      ctx.input.statementGuid
    );
    return {
      output: { ...mapStatement(statement), raw: statement },
      message: 'Retrieved the statement metadata.'
    };
  })
  .build();

export let downloadStatement = SlateTool.create(spec, {
  name: 'Download Statement PDF',
  key: 'download_statement',
  description: 'Download the PDF for a statement returned by List Statements.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      userGuid: z.string().describe('MX GUID of the user'),
      memberGuid: z.string().describe('MX GUID of the member'),
      statementGuid: z.string().describe('MX GUID of the statement, from List Statements')
    })
  )
  .output(
    z.object({
      statementGuid: z.string().describe('Requested statement identifier'),
      filename: z.string().describe('PDF filename'),
      mimeType: z.literal('application/pdf')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MxClient({ token: ctx.auth.token, environment: ctx.config.environment });
    await client.readStatement(
      ctx.input.userGuid,
      ctx.input.memberGuid,
      ctx.input.statementGuid
    );
    let filename = `statement-${ctx.input.statementGuid.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    await ctx.addAttachment({
      type: 'url',
      url: client.statementDownloadUrl(
        ctx.input.userGuid,
        ctx.input.memberGuid,
        ctx.input.statementGuid
      ),
      headers: {
        Authorization: `Basic ${ctx.auth.token}`,
        Accept: 'application/vnd.mx.api.v1+pdf'
      },
      filename,
      mimeType: 'application/pdf'
    });
    return {
      output: {
        statementGuid: ctx.input.statementGuid,
        filename,
        mimeType: 'application/pdf' as const
      },
      message: 'Prepared the statement PDF for download.'
    };
  })
  .build();

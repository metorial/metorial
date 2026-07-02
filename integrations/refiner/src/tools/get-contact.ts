import { SlateTool } from 'slates';
import { z } from 'zod';
import { RefinerClient } from '../lib/client';
import { spec } from '../spec';

export let getContact = SlateTool.create(spec, {
  name: 'Get Contact',
  key: 'get_contact',
  description: `Retrieve detailed information about a specific contact, including their attributes, segments, and account association. Identify the contact by their user ID, email, or Refiner UUID.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe('External user ID used when identifying the contact'),
      email: z.string().optional().describe('Email address of the contact'),
      contactUuid: z.string().optional().describe('Refiner internal UUID of the contact')
    })
  )
  .output(
    z.object({
      contactUuid: z.string().describe('Refiner internal UUID of the contact'),
      remoteId: z.string().nullable().describe('External user ID'),
      email: z.string().nullable().describe('Email address'),
      displayName: z.string().nullable().describe('Display name'),
      firstSeenAt: z.string().nullable().describe('ISO 8601 timestamp of first seen'),
      lastSeenAt: z.string().nullable().describe('ISO 8601 timestamp of last seen'),
      attributes: z.record(z.string(), z.unknown()).describe('Custom traits and attributes'),
      segments: z
        .array(
          z.object({
            segmentUuid: z.string().describe('UUID of the segment'),
            name: z.string().describe('Name of the segment')
          })
        )
        .describe('Segments the contact belongs to'),
      account: z
        .object({
          accountUuid: z.string().nullable().describe('UUID of the account'),
          remoteId: z.string().nullable().describe('External account ID'),
          displayName: z.string().nullable().describe('Account display name'),
          domain: z.string().nullable().describe('Account domain')
        })
        .nullable()
        .describe('Associated account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RefinerClient({ token: ctx.auth.token });

    let item = (await client.getContact({
      id: ctx.input.userId,
      email: ctx.input.email,
      uuid: ctx.input.contactUuid
    })) as any;

    let output = {
      contactUuid: item.uuid,
      remoteId: item.remote_id ?? null,
      email: item.email ?? null,
      displayName: item.display_name ?? null,
      firstSeenAt: item.first_seen_at ?? null,
      lastSeenAt: item.last_seen_at ?? null,
      attributes: item.attributes ?? {},
      segments: (item.segments || []).map((s: any) => ({
        segmentUuid: s.uuid,
        name: s.name
      })),
      account: item.account
        ? {
            accountUuid: item.account.uuid ?? null,
            remoteId: item.account.remote_id ?? null,
            displayName: item.account.display_name ?? null,
            domain: item.account.domain ?? null
          }
        : null
    };

    return {
      output,
      message: `Retrieved contact **${output.displayName || output.email || output.remoteId || output.contactUuid}**.`
    };
  })
  .build();

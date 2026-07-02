import { SlateTool } from 'slates';
import { z } from 'zod';
import { GongClient } from '../lib/client';
import { gongServiceError } from '../lib/errors';
import { spec } from '../spec';

export let lookupPrivacyData = SlateTool.create(spec, {
  name: 'Lookup Privacy Data',
  key: 'lookup_privacy_data',
  description: `Look up all Gong elements referencing a specific email address or phone number. Useful for GDPR data subject access requests (DSARs) to understand what data exists for a person.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      emailAddress: z.string().optional().describe('Email address to look up'),
      phoneNumber: z.string().optional().describe('Phone number to look up')
    })
  )
  .output(
    z.object({
      references: z.any().describe('Elements in Gong that reference the given identifier')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GongClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl
    });

    let result: any;

    if (ctx.input.emailAddress) {
      result = await client.getDataPrivacyForEmail(ctx.input.emailAddress);
    } else if (ctx.input.phoneNumber) {
      result = await client.getDataPrivacyForPhone(ctx.input.phoneNumber);
    } else {
      throw gongServiceError('Either emailAddress or phoneNumber must be provided.');
    }

    return {
      output: {
        references: result
      },
      message: `Found privacy data references for **${ctx.input.emailAddress || ctx.input.phoneNumber}**.`
    };
  })
  .build();

export let erasePrivacyData = SlateTool.create(spec, {
  name: 'Erase Privacy Data',
  key: 'erase_privacy_data',
  description: `Erase all references to a specific email address or phone number from Gong. Supports GDPR right-to-erasure compliance. **This action is irreversible.**`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      emailAddress: z.string().optional().describe('Email address to erase data for'),
      phoneNumber: z.string().optional().describe('Phone number to erase data for')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the erasure was initiated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GongClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl
    });

    if (ctx.input.emailAddress) {
      await client.eraseDataForEmail(ctx.input.emailAddress);
    } else if (ctx.input.phoneNumber) {
      await client.eraseDataForPhone(ctx.input.phoneNumber);
    } else {
      throw gongServiceError('Either emailAddress or phoneNumber must be provided.');
    }

    return {
      output: {
        success: true
      },
      message: `Initiated data erasure for **${ctx.input.emailAddress || ctx.input.phoneNumber}**.`
    };
  })
  .build();

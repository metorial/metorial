import { SlateTool } from 'slates';
import { z } from 'zod';
import { SnsClient } from '../lib/client';
import { spec } from '../spec';

export let checkSmsOptOut = SlateTool.create(spec, {
  name: 'Check SMS Opt Out',
  key: 'check_sms_opt_out',
  description: `Check whether a phone number has opted out of receiving SMS messages from this AWS account. SNS cannot send SMS messages to opted-out phone numbers.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      phoneNumber: z.string().describe('Phone number in E.164 format')
    })
  )
  .output(
    z.object({
      phoneNumber: z.string().describe('Phone number that was checked'),
      isOptedOut: z
        .boolean()
        .describe('Whether the phone number is opted out of SNS SMS delivery')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnsClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let isOptedOut = await client.checkIfPhoneNumberIsOptedOut(ctx.input.phoneNumber);

    return {
      output: {
        phoneNumber: ctx.input.phoneNumber,
        isOptedOut
      },
      message: `Phone number \`${ctx.input.phoneNumber}\` is ${isOptedOut ? 'opted out' : 'not opted out'}`
    };
  })
  .build();

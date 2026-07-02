import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let _hiyaCommentSchema = z
  .object({
    category: z
      .number()
      .optional()
      .describe('Comment category (1=legitimate, 2-7=spam types, 8=fraud, 10=robocaller)'),
    comment: z.string().optional().describe('User comment text')
  })
  .optional();

let hiyaDataSchema = z
  .object({
    name: z.string().optional().describe('Caller name identified by Hiya'),
    type: z.string().optional().describe('Caller type (Business/Personal)'),
    isSpam: z.boolean().optional().describe('Whether flagged as spam'),
    reputation: z.string().optional().describe('Reputation level (GOOD/SPAM/UNCERTAIN)'),
    spamScore: z.number().optional().describe('Spam score (0-100)'),
    reputationScore: z.number().optional().describe('Reputation score (0-100)'),
    category: z.string().optional().describe('Business category'),
    comments: z
      .array(
        z.object({
          category: z.number().optional(),
          comment: z.string().optional()
        })
      )
      .optional()
      .describe('User-submitted reports')
  })
  .optional();

let truecallerDataSchema = z
  .object({
    name: z.string().optional().describe('Name from Truecaller'),
    type: z.string().optional().describe('Number type'),
    countryCode: z.string().optional().describe('Country code'),
    timezone: z.string().optional().describe('Timezone')
  })
  .optional();

let callappDataSchema = z
  .object({
    name: z.string().optional().describe('Name from CallApp'),
    websites: z.array(z.string()).optional().describe('Associated websites'),
    addresses: z.array(z.string()).optional().describe('Associated addresses'),
    rating: z.number().optional().describe('Business rating'),
    openingHours: z.any().optional().describe('Business opening hours'),
    category: z.string().optional().describe('Business category')
  })
  .optional();

let viewcallerDataSchema = z
  .object({
    names: z
      .array(
        z.object({
          name: z.string().optional(),
          count: z.number().optional()
        })
      )
      .optional()
      .describe('Name variants with occurrence counts')
  })
  .optional();

let eyeconDataSchema = z
  .object({
    name: z.string().optional().describe('Name from EyeCon')
  })
  .optional();

export let getCallerId = SlateTool.create(spec, {
  name: 'Get Caller ID',
  key: 'get_caller_id',
  description: `Retrieve detailed caller identification data from multiple third-party providers (Truecaller, Hiya, CallApp, ViewCaller, EyeCon). Returns names, addresses, websites, social media profiles, business categories, ratings, opening hours, and spam scores from each source.`,
  instructions: ['Phone numbers must be in E.164 format (e.g., +18006927753)'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      phoneNumber: z.string().describe('Phone number in E.164 format (e.g., +18006927753)')
    })
  )
  .output(
    z.object({
      truecaller: truecallerDataSchema.describe('Data from Truecaller'),
      callapp: callappDataSchema.describe('Data from CallApp'),
      viewcaller: viewcallerDataSchema.describe('Data from ViewCaller'),
      eyecon: eyeconDataSchema.describe('Data from EyeCon'),
      hiya: hiyaDataSchema.describe('Data from Hiya'),
      rawResponse: z.any().optional().describe('Full raw API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getPhoneInfo(ctx.input.phoneNumber);

    let truecaller = result.truecaller || {};
    let callapp = result.callapp || {};
    let viewcaller = result.viewcaller || {};
    let eyecon = result.eyecon || {};
    let hiya = result.hiya || {};

    return {
      output: {
        truecaller: {
          name: truecaller.name,
          type: truecaller.type,
          countryCode: truecaller.country_code,
          timezone: truecaller.timezone
        },
        callapp: {
          name: callapp.name,
          websites: callapp.websites,
          addresses: callapp.addresses,
          rating: callapp.rating,
          openingHours: callapp.opening_hours,
          category: callapp.category
        },
        viewcaller: {
          names: viewcaller.names
        },
        eyecon: {
          name: eyecon.name
        },
        hiya: {
          name: hiya.name,
          type: hiya.type,
          isSpam: hiya.is_spam,
          reputation: hiya.reputation,
          spamScore: hiya.spam_score,
          reputationScore: hiya.reputation_score,
          category: hiya.category,
          comments: hiya.comments
        },
        rawResponse: result
      },
      message: `Retrieved caller ID data for **${ctx.input.phoneNumber}** from multiple providers.`
    };
  })
  .build();

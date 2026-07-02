import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let contactIntelligence = SlateTool.create(spec, {
  name: 'Contact Intelligence',
  key: 'contact_intelligence',
  description: `Analyze and profile contact information including **email addresses**, **phone numbers**, and **IP addresses**.

- **Email validation**: Validate deliverability and get demographic data (entity type, domain info).
- **Email trust score**: Get a trust score (0–99) with AI-generated reasoning about email legitimacy.
- **Phone profile**: Get carrier, type, time zone, region, validation, and risk assessment.
- **IP profile**: Get organization, geolocation, CIDR, reputation, and abuse contact data.

Email trust, phone, and IP profiling are **premium APIs** consuming multiple credits per call.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      profileType: z
        .enum(['email_validation', 'email_trust', 'phone', 'ip_address'])
        .describe('Type of contact to profile'),
      value: z.string().describe('The email address, phone number, or IP address to analyze')
    })
  )
  .output(
    z.object({
      profileData: z.record(z.string(), z.any()).describe('The contact intelligence data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result: Record<string, any>;

    switch (ctx.input.profileType) {
      case 'email_validation':
        result = await client.getEmailInfo(ctx.input.value);
        break;
      case 'email_trust':
        result = await client.getEmailTrustScore(ctx.input.value);
        break;
      case 'phone':
        result = await client.getPhoneProfile(ctx.input.value);
        break;
      case 'ip_address':
        result = await client.getIPProfile(ctx.input.value);
        break;
    }

    return {
      output: {
        profileData: result
      },
      message: `Analyzed ${ctx.input.profileType.replace('_', ' ')} for "${ctx.input.value}"`
    };
  })
  .build();

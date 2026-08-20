import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    affiliateId: {
      schema: z
        .string()
        .optional()
        .describe('Partner affiliate ID (aid) appended to SeatGeek URLs for revenue tracking'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    referralId: {
      schema: z
        .string()
        .optional()
        .describe('Partner referral ID (rid) appended to SeatGeek URLs for revenue tracking'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});

import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    affiliateId: z
      .string()
      .optional()
      .describe('Partner affiliate ID (aid) appended to SeatGeek URLs for revenue tracking'),
    referralId: z
      .string()
      .optional()
      .describe('Partner referral ID (rid) appended to SeatGeek URLs for revenue tracking')
  })
);

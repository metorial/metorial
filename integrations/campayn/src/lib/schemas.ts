import { z } from 'zod';
import type { CampaynEmail } from './client';

export let emailSchema = z.object({
  emailId: z.string().describe('Unique identifier for the email'),
  name: z.string().describe('Email name/subject'),
  scheduledDate: z.string().nullable().describe('Scheduled send date, null if not scheduled'),
  sendNow: z.string().describe('Whether the email was sent immediately (0 or 1)'),
  sendCount: z.string().describe('Number of recipients'),
  campaignTitle: z.string().nullable().describe('Associated campaign title'),
  status: z.string().describe('Email status (e.g. delivered, incomplete)'),
  uniqueViews: z.number().describe('Number of unique opens'),
  uniqueResponses: z.number().describe('Number of unique clicks/responses'),
  percentViews: z.number().describe('Open rate percentage'),
  percentResponses: z.number().describe('Response rate percentage'),
  previewUrl: z.string().describe('URL to preview the email'),
  previewThumb: z.string().describe('Thumbnail preview URL')
});

export let formatEmail = (email: CampaynEmail) => ({
  emailId: email.id,
  name: email.name,
  scheduledDate: email.scheduled_date,
  sendNow: email.send_now,
  sendCount: email.send_count,
  campaignTitle: email.campaign_title,
  status: email.status,
  uniqueViews: email.unique_views,
  uniqueResponses: email.unique_responses,
  percentViews: email.percent_views,
  percentResponses: email.percent_responses,
  previewUrl: email.preview_url,
  previewThumb: email.preview_thumb
});

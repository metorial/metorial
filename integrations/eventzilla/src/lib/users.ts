import { z } from 'zod';

export let userSchema = z.object({
  userId: z.number().describe('User ID'),
  username: z.string().optional().describe('Username'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  email: z.string().optional().describe('Email address'),
  company: z.string().optional().describe('Company name'),
  addressLine1: z.string().optional().describe('Address line 1'),
  addressLine2: z.string().optional().describe('Address line 2'),
  addressLocality: z.string().optional().describe('City/locality'),
  addressRegion: z.string().optional().describe('State/region'),
  addressCountry: z.string().optional().describe('Country'),
  zipCode: z.string().optional().describe('ZIP/postal code'),
  timezone: z.string().optional().describe('Timezone'),
  website: z.string().optional().describe('Website URL'),
  phonePrimary: z.string().optional().describe('Primary phone number'),
  avatarUrl: z.string().optional().describe('Avatar image URL'),
  facebookId: z.string().optional().describe('Facebook ID'),
  twitterId: z.string().optional().describe('Twitter ID'),
  lastSeen: z.string().optional().describe('Last seen timestamp'),
  userType: z.string().optional().describe('User type: organizer or sub-organizer')
});

export let mapUser = (u: Record<string, any>) => ({
  userId: u.id,
  username: u.username,
  firstName: u.first_name,
  lastName: u.last_name,
  email: u.email,
  company: u.company,
  addressLine1: u.address_line1,
  addressLine2: u.address_line2,
  addressLocality: u.address_locality,
  addressRegion: u.address_region,
  addressCountry: u.address_country,
  zipCode: u.zip_code,
  timezone: u.timezone,
  website: u.website,
  phonePrimary: u.phone_primary,
  avatarUrl: u.avatar_url,
  facebookId: u.facebook_id,
  twitterId: u.twitter_id,
  lastSeen: u.last_seen,
  userType: u.user_type
});

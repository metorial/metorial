import { createApiServiceError } from 'slates';
import { z } from 'zod';

export let scimUserSchema = z.object({
  userId: z.string().describe('SCIM user ID'),
  userName: z.string().describe('Username (typically email)'),
  givenName: z.string().optional().describe('First name'),
  familyName: z.string().optional().describe('Last name'),
  email: z.string().optional().describe('Work email address'),
  active: z.boolean().optional().describe('Whether the user account is active')
});

let responseSchema = z.object({
  id: z.string(),
  userName: z.string(),
  name: z
    .object({
      givenName: z.string().nullish(),
      familyName: z.string().nullish()
    })
    .nullish(),
  emails: z
    .array(
      z.object({
        value: z.string().nullish(),
        type: z.string().nullish(),
        primary: z.boolean().nullish()
      })
    )
    .nullish(),
  active: z.boolean().nullish()
});

export let parseScimUser = (response: unknown) => {
  let result = responseSchema.safeParse(response);
  if (!result.success) {
    throw createApiServiceError('InVision returned an invalid SCIM user profile.');
  }
  return result.data;
};

export let formatScimUser = (response: unknown) => {
  let user = parseScimUser(response);
  return {
    userId: user.id,
    userName: user.userName,
    givenName: user.name?.givenName ?? undefined,
    familyName: user.name?.familyName ?? undefined,
    email:
      user.emails?.find(email => email.type?.toLowerCase() === 'work')?.value ??
      user.emails?.find(email => email.primary)?.value ??
      user.emails?.[0]?.value ??
      undefined,
    active: user.active ?? undefined
  };
};

import { defineToolRecipe } from '@slates/tool-recipes';
import {
  allOf,
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  requestAxiosData
} from 'slates';
import { z } from 'zod';

export const googleIdentityScopes = {
  userinfoEmail: 'https://www.googleapis.com/auth/userinfo.email',
  userinfoProfile: 'https://www.googleapis.com/auth/userinfo.profile'
} as const;

export const googleIdentityActionScopes = allOf(
  googleIdentityScopes.userinfoEmail,
  googleIdentityScopes.userinfoProfile
);
export const getCurrentUserInputSchema = z.object({});
export const currentUserSchema = z.object({
  id: z.string().min(1).describe('Stable Google account ID'),
  email: z.string().optional().describe('Google account email address, when provided'),
  name: z.string().optional().describe('Display name, when provided'),
  picture: z.string().optional().describe('Profile image URL, when provided')
});
export type GoogleUserInfo = z.infer<typeof currentUserSchema>;

export const formatGoogleUserInfo = (value: unknown): GoogleUserInfo => {
  const result = currentUserSchema.safeParse(value);
  if (!result.success) {
    throw createApiServiceError('Google returned an invalid account profile.', {
      reason: 'google_identity_invalid_profile'
    });
  }
  return result.data;
};

export const googleIdentityApiError = (error: unknown, operation = 'get current user') =>
  buildApiServiceError(error, {
    providerLabel: 'Google Identity',
    operation,
    reason: 'google_identity_api_error',
    nestedKeys: ['error', 'errors']
  });

export class GoogleIdentityClient {
  private readonly http;
  constructor(config: { token: string }) {
    this.http = createAuthenticatedAxios({
      baseURL: 'https://www.googleapis.com/oauth2/v2',
      authHeader: { value: `Bearer ${config.token}` }
    });
  }
  async getCurrentUser(): Promise<GoogleUserInfo> {
    const profile = await requestAxiosData<GoogleUserInfo>(
      'get current user',
      () => this.http.get<GoogleUserInfo>('/userinfo'),
      googleIdentityApiError
    );
    return formatGoogleUserInfo(profile);
  }
}

export const createGoogleIdentityClient = (ctx: { auth: { token: string } }) =>
  new GoogleIdentityClient({ token: ctx.auth.token });

export type GoogleIdentityRecipeDependencies = {
  createClient: (ctx: {
    auth: { token: string };
  }) => Pick<GoogleIdentityClient, 'getCurrentUser'>;
};

export const getCurrentUserRecipe = defineToolRecipe({
  key: 'get_current_user',
  name: 'Get Current User',
  description:
    'Get the connected Google account ID, email address, name, and profile image when available.',
  tags: { readOnly: true, destructive: false },
  defaultScopes: googleIdentityActionScopes,
  inputSchema: getCurrentUserInputSchema,
  outputSchema: currentUserSchema,
  handleInvocation: async ({
    ctx,
    dependencies
  }: {
    ctx: { auth: Readonly<Record<string, unknown>> };
    dependencies: GoogleIdentityRecipeDependencies;
  }) => {
    const token = ctx.auth.token;
    if (typeof token !== 'string' || !token) {
      throw createApiServiceError(
        'Connect a Google OAuth account before looking up its profile.'
      );
    }
    const output = await dependencies.createClient({ auth: { token } }).getCurrentUser();
    return {
      output,
      message: `Connected Google account: ${output.email ?? output.name ?? output.id}.`
    };
  }
});

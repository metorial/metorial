import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { googleAdminScopes } from './scopes';

let googleAxios = createAxios({
  baseURL: 'https://oauth2.googleapis.com'
});

let profileAxios = createAxios({
  baseURL: 'https://www.googleapis.com'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'Google OAuth 2.0',
    key: 'google_oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://support.google.com/cloud/answer/15544987'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.google.com/identity/protocols/oauth2/scopes'
      }
    ],

    scopes: [
      {
        title: 'Users (Read/Write)',
        description: 'Full access to manage users',
        scope: googleAdminScopes.adminDirectoryUser
      },
      {
        title: 'Users (Read Only)',
        description: 'View user information',
        scope: googleAdminScopes.adminDirectoryUserReadonly
      },
      {
        title: 'User Aliases (Read/Write)',
        description: 'Manage user email aliases',
        scope: googleAdminScopes.adminDirectoryUserAlias
      },
      {
        title: 'User Aliases (Read Only)',
        description: 'View user email aliases',
        scope: googleAdminScopes.adminDirectoryUserAliasReadonly
      },
      {
        title: 'Groups (Read/Write)',
        description: 'Full access to manage groups',
        scope: googleAdminScopes.adminDirectoryGroup
      },
      {
        title: 'Groups (Read Only)',
        description: 'View group information',
        scope: googleAdminScopes.adminDirectoryGroupReadonly
      },
      {
        title: 'Group Members (Read/Write)',
        description: 'Manage group membership',
        scope: googleAdminScopes.adminDirectoryGroupMember
      },
      {
        title: 'Group Members (Read Only)',
        description: 'View group membership',
        scope: googleAdminScopes.adminDirectoryGroupMemberReadonly
      },
      {
        title: 'Groups Settings',
        description: 'Manage group settings and policies',
        scope: googleAdminScopes.appsGroupsSettings
      },
      {
        title: 'Org Units (Read/Write)',
        description: 'Manage organizational units',
        scope: googleAdminScopes.adminDirectoryOrgunit
      },
      {
        title: 'Org Units (Read Only)',
        description: 'View organizational units',
        scope: googleAdminScopes.adminDirectoryOrgunitReadonly
      },
      {
        title: 'Roles (Read/Write)',
        description: 'Manage admin roles and assignments',
        scope: googleAdminScopes.adminDirectoryRolemanagement
      },
      {
        title: 'Roles (Read Only)',
        description: 'View admin roles and assignments',
        scope: googleAdminScopes.adminDirectoryRolemanagementReadonly
      },
      {
        title: 'ChromeOS Devices (Read/Write)',
        description: 'Manage ChromeOS devices',
        scope: googleAdminScopes.adminDirectoryDeviceChromeos
      },
      {
        title: 'ChromeOS Devices (Read Only)',
        description: 'View ChromeOS devices',
        scope: googleAdminScopes.adminDirectoryDeviceChromeosReadonly
      },
      {
        title: 'Mobile Devices (Read/Write)',
        description: 'Manage mobile devices',
        scope: googleAdminScopes.adminDirectoryDeviceMobile
      },
      {
        title: 'Mobile Devices (Read Only)',
        description: 'View mobile devices',
        scope: googleAdminScopes.adminDirectoryDeviceMobileReadonly
      },
      {
        title: 'Domains (Read/Write)',
        description: 'Manage domains and domain aliases',
        scope: googleAdminScopes.adminDirectoryDomain
      },
      {
        title: 'Domains (Read Only)',
        description: 'View domains and domain aliases',
        scope: googleAdminScopes.adminDirectoryDomainReadonly
      },
      {
        title: 'Customers (Read/Write)',
        description: 'Manage customer account information',
        scope: googleAdminScopes.adminDirectoryCustomer
      },
      {
        title: 'Customers (Read Only)',
        description: 'View customer account information',
        scope: googleAdminScopes.adminDirectoryCustomerReadonly
      },
      {
        title: 'Calendar Resources (Read/Write)',
        description: 'Manage calendar resources such as rooms and equipment',
        scope: googleAdminScopes.adminDirectoryResourceCalendar
      },
      {
        title: 'Calendar Resources (Read Only)',
        description: 'View calendar resources',
        scope: googleAdminScopes.adminDirectoryResourceCalendarReadonly
      },
      {
        title: 'Audit Reports (Read Only)',
        description: 'View admin audit logs and activity reports',
        scope: googleAdminScopes.adminReportsAuditReadonly
      },
      {
        title: 'Usage Reports (Read Only)',
        description: 'View usage reports for apps and entities',
        scope: googleAdminScopes.adminReportsUsageReadonly
      },
      {
        title: 'Licensing',
        description: 'Manage Google Workspace product licenses',
        scope: googleAdminScopes.appsLicensing
      },
      {
        title: 'Data Transfer',
        description: 'Manage ownership transfers of user data between Workspace users',
        scope: googleAdminScopes.adminDatatransfer
      },
      {
        title: 'User Profile',
        description: 'View basic profile info of the authenticated user',
        scope: googleAdminScopes.userInfoEmail
      },
      {
        title: 'User Profile Name',
        description: 'View the name of the authenticated user',
        scope: googleAdminScopes.userInfoProfile
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        state: ctx.state,
        access_type: 'offline',
        prompt: 'consent'
      });

      return {
        url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let response = await googleAxios.post(
        '/token',
        new URLSearchParams({
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri,
          grant_type: 'authorization_code'
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;
      let grantedScopes =
        typeof data.scope === 'string' ? data.scope.split(' ').filter(Boolean) : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        },
        scopes: grantedScopes
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw new Error('No refresh token available');
      }

      let response = await googleAxios.post(
        '/token',
        new URLSearchParams({
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token'
        }).toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: {};
      scopes: string[];
    }) => {
      let response = await profileAxios.get('/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${ctx.output.token}` }
      });

      let data = response.data;

      return {
        profile: {
          id: data.id,
          email: data.email,
          name: data.name,
          imageUrl: data.picture
        }
      };
    }
  });

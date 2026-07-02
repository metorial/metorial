import { z } from 'zod';

export let driveItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number().optional(),
  webUrl: z.string().optional(),
  createdDateTime: z.string().optional(),
  lastModifiedDateTime: z.string().optional(),
  createdBy: z
    .object({
      user: z
        .object({
          id: z.string().optional(),
          displayName: z.string().optional(),
          email: z.string().optional()
        })
        .optional()
    })
    .optional(),
  lastModifiedBy: z
    .object({
      user: z
        .object({
          id: z.string().optional(),
          displayName: z.string().optional(),
          email: z.string().optional()
        })
        .optional()
    })
    .optional(),
  parentReference: z
    .object({
      driveId: z.string().optional(),
      driveType: z.string().optional(),
      id: z.string().optional(),
      path: z.string().optional()
    })
    .optional(),
  file: z
    .object({
      mimeType: z.string().optional(),
      hashes: z
        .object({
          sha1Hash: z.string().optional(),
          sha256Hash: z.string().optional()
        })
        .optional()
    })
    .optional(),
  folder: z
    .object({
      childCount: z.number().optional()
    })
    .optional()
});

export type DriveItem = z.infer<typeof driveItemSchema>;

export let permissionSchema = z.object({
  id: z.string().optional(),
  roles: z.array(z.string()).optional(),
  link: z
    .object({
      type: z.string().optional(),
      scope: z.string().optional(),
      webUrl: z.string().optional(),
      application: z
        .object({
          id: z.string().optional(),
          displayName: z.string().optional()
        })
        .optional()
    })
    .optional(),
  grantedTo: z
    .object({
      user: z
        .object({
          id: z.string().optional(),
          displayName: z.string().optional(),
          email: z.string().optional()
        })
        .optional()
    })
    .optional(),
  grantedToIdentities: z
    .array(
      z.object({
        user: z
          .object({
            id: z.string().optional(),
            displayName: z.string().optional(),
            email: z.string().optional()
          })
          .optional()
      })
    )
    .optional(),
  invitation: z
    .object({
      email: z.string().optional(),
      signInRequired: z.boolean().optional()
    })
    .optional()
});

export type Permission = z.infer<typeof permissionSchema>;

export let driveItemVersionSchema = z.object({
  id: z.string(),
  lastModifiedDateTime: z.string().optional(),
  size: z.number().optional(),
  lastModifiedBy: z
    .object({
      user: z
        .object({
          id: z.string().optional(),
          displayName: z.string().optional(),
          email: z.string().optional()
        })
        .optional()
    })
    .optional()
});

export type DriveItemVersion = z.infer<typeof driveItemVersionSchema>;

export let thumbnailSetSchema = z.object({
  id: z.string().optional(),
  small: z
    .object({
      url: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional()
    })
    .optional(),
  medium: z
    .object({
      url: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional()
    })
    .optional(),
  large: z
    .object({
      url: z.string().optional(),
      width: z.number().optional(),
      height: z.number().optional()
    })
    .optional()
});

export type ThumbnailSet = z.infer<typeof thumbnailSetSchema>;

export let subscriptionSchema = z.object({
  id: z.string(),
  resource: z.string(),
  changeType: z.string(),
  notificationUrl: z.string(),
  expirationDateTime: z.string(),
  clientState: z.string().optional()
});

export type Subscription = z.infer<typeof subscriptionSchema>;

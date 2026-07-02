import { createAxios } from '@slates/provider';
import { withFirebaseApiError } from './errors';

let firebaseManagementAxios = createAxios({
  baseURL: 'https://firebase.googleapis.com/v1beta1'
});

export type FirebaseAppPlatform = 'android' | 'ios' | 'web';

export interface FirebaseApp {
  platform: FirebaseAppPlatform;
  name: string;
  appId: string;
  displayName?: string;
  projectId?: string;
  state?: string;
  apiKeyId?: string;
  packageName?: string;
  bundleId?: string;
  appStoreId?: string;
  teamId?: string;
  appUrls?: string[];
  sha1Hashes?: string[];
  sha256Hashes?: string[];
  expireTime?: string;
  etag?: string;
}

export interface FirebaseAppConfig {
  platform: FirebaseAppPlatform;
  projectId?: string;
  appId?: string;
  apiKey?: string;
  authDomain?: string;
  databaseURL?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
  projectNumber?: string;
  locationId?: string;
  configFilename?: string;
  configFileContents?: string;
}

let collectionByPlatform: Record<FirebaseAppPlatform, string> = {
  android: 'androidApps',
  ios: 'iosApps',
  web: 'webApps'
};

let mapFirebaseApp = (platform: FirebaseAppPlatform, app: any): FirebaseApp => ({
  platform,
  name: app.name,
  appId: app.appId,
  displayName: app.displayName,
  projectId: app.projectId,
  state: app.state,
  apiKeyId: app.apiKeyId,
  packageName: app.packageName,
  bundleId: app.bundleId,
  appStoreId: app.appStoreId,
  teamId: app.teamId,
  appUrls: app.appUrls,
  sha1Hashes: app.sha1Hashes,
  sha256Hashes: app.sha256Hashes,
  expireTime: app.expireTime,
  etag: app.etag
});

let mapFirebaseAppConfig = (
  platform: FirebaseAppPlatform,
  config: any
): FirebaseAppConfig => ({
  platform,
  projectId: config.projectId,
  appId: config.appId,
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  databaseURL: config.databaseURL,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  measurementId: config.measurementId,
  projectNumber: config.projectNumber,
  locationId: config.locationId,
  configFilename: config.configFilename,
  configFileContents: config.configFileContents
});

export class FirebaseManagementClient {
  private token: string;
  private projectId: string;

  constructor(params: { token: string; projectId: string }) {
    this.token = params.token;
    this.projectId = params.projectId;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`
    };
  }

  private appResourceName(platform: FirebaseAppPlatform, appIdOrName: string) {
    if (appIdOrName.startsWith('projects/')) {
      return appIdOrName.replace(/\/config$/, '');
    }

    return `projects/${this.projectId}/${collectionByPlatform[platform]}/${appIdOrName}`;
  }

  async listApps(
    platform: FirebaseAppPlatform,
    params?: { pageSize?: number; pageToken?: string; showDeleted?: boolean }
  ): Promise<{ apps: FirebaseApp[]; nextPageToken?: string }> {
    let response = await withFirebaseApiError(`Management list ${platform} apps`, () =>
      firebaseManagementAxios.get(
        `/projects/${this.projectId}/${collectionByPlatform[platform]}`,
        {
          headers: this.headers,
          params: {
            pageSize: params?.pageSize,
            pageToken: params?.pageToken,
            showDeleted: params?.showDeleted
          }
        }
      )
    );

    return {
      apps: (response.data.apps || []).map((app: any) => mapFirebaseApp(platform, app)),
      nextPageToken: response.data.nextPageToken
    };
  }

  async getApp(platform: FirebaseAppPlatform, appIdOrName: string): Promise<FirebaseApp> {
    let resourceName = this.appResourceName(platform, appIdOrName);
    let response = await withFirebaseApiError(`Management get ${platform} app`, () =>
      firebaseManagementAxios.get(`/${resourceName}`, {
        headers: this.headers
      })
    );

    return mapFirebaseApp(platform, response.data);
  }

  async getAppConfig(
    platform: FirebaseAppPlatform,
    appIdOrName: string
  ): Promise<FirebaseAppConfig> {
    let resourceName = this.appResourceName(platform, appIdOrName);
    let response = await withFirebaseApiError(`Management get ${platform} app config`, () =>
      firebaseManagementAxios.get(`/${resourceName}/config`, {
        headers: this.headers
      })
    );

    return mapFirebaseAppConfig(platform, response.data);
  }
}

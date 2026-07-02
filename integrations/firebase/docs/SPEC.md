# Slates Specification for Firebase

## Overview

Firebase is a Google-backed Backend-as-a-Service (BaaS) platform that provides cloud-hosted databases, user authentication, cloud messaging, file storage, remote configuration, and serverless functions. Firebase is a platform that provides backend services, including real-time databases, authentication, and hosting. It exposes REST APIs for most of its services and offers Admin SDKs for privileged server-side access.

## Authentication

Firebase services support two primary authentication methods for API access:

### 1. Google OAuth 2.0 with Service Account (Server-to-Server)

This is the recommended method for server-side integrations. Firebase projects support Google service accounts, which you can use to call Firebase server APIs from your app server or trusted environment.

**Setup:**

1. To authenticate a service account and authorize it to access Firebase services, you must generate a private key file in JSON format. To generate a private key file for your service account: In the Firebase console, open Settings > Service Accounts.
2. Use the service account key JSON file to generate an OAuth 2.0 access token.
3. Pass it to the endpoints as an Authorization header set to `Bearer {YOUR_TOKEN}`.

**Required Scopes (vary by service):**

- Realtime Database: `https://www.googleapis.com/auth/firebase.database` and `https://www.googleapis.com/auth/userinfo.email`
- Firestore / Cloud Messaging / General: `https://www.googleapis.com/auth/cloud-platform`

If you authenticate your requests with a service account and a Google Identity OAuth 2.0 token, Cloud Firestore assumes that your requests act on behalf of your application instead of an individual user. Cloud Firestore allows these requests to ignore your security rules. Instead, Cloud Firestore uses IAM to determine if a request is authorized.

### 2. Firebase ID Tokens (User-Context)

When a user or device signs in using Firebase Authentication, Firebase creates a corresponding ID token that uniquely identifies them and grants them access to several resources. You can re-use that ID token to authenticate the Realtime Database REST API and make requests on behalf of that user.

- For Realtime Database: pass the ID token as the `auth=<ID_TOKEN>` query parameter.
- For Firestore: pass it as an `Authorization: Bearer <ID_TOKEN>` header.
- For requests authenticated with a Firebase ID token and for unauthenticated requests, Cloud Firestore uses your Cloud Firestore Security Rules to determine if a request is authorized.

### 3. API Key (for Firebase Auth REST API)

The Firebase Authentication REST API itself uses a Web API Key (found in Firebase Console project settings) passed as a `key` query parameter. This is used for client-side operations like signing up users, signing in, and managing accounts.

**Required inputs for integration:**

- Firebase Project ID
- Service Account Key JSON (for server-to-server auth)
- Database URL (for Realtime Database, e.g., `https://<DATABASE_NAME>.firebaseio.com`)
- Firebase Web API key (for Firebase Authentication user creation via the Identity Toolkit REST API)
- Storage bucket name (optional; used when the default bucket is not `<projectId>.appspot.com`)

## Features

### User Authentication Management

The Firebase Admin SDK provides an API for managing your Firebase users with elevated privileges. The admin user management API gives you the ability to programmatically retrieve, create, update, and delete users without requiring a user's existing credentials. It supports authentication using passwords, phone numbers, popular federated identity providers like Google, Facebook and Twitter, and more.

- Create, update, delete, and list user accounts.
- You may want to implement fine-grained access control for users already signed in. A combination of custom user claims and application security rules provides this capability.

### Cloud Firestore (Document Database)

Cloud Firestore is a flexible, scalable database for mobile, web, and server development from Firebase and Google Cloud.

- Create, read, update, and delete documents organized in collections.
- Run queries with filters, ordering, and compound conditions.
- All REST API endpoints exist under the base URL `https://firestore.googleapis.com/v1/`.
- Documents are accessed via paths: `/projects/{PROJECT_ID}/databases/(default)/documents/{collection}/{document}`.

### Realtime Database

The Firebase Realtime Database is a cloud-hosted database. Data is stored as JSON and synchronized in realtime to every connected client.

- Full CRUD operations via REST (GET, PUT, POST, PATCH, DELETE).
- You can define any Firebase Realtime Database URL as a REST endpoint by adding `.json` in the end.
- Supports querying with `orderBy`, `startAt`, `endAt`, `limitToFirst`, and `limitToLast` parameters.
- Supports conditional writes using ETags.

### Cloud Messaging (FCM)

Firebase Cloud Messaging (FCM) is a reliable cross-platform messaging solution.

- Send notification and data messages to individual devices, topics, or device groups.
- Target messages to specific platforms (Android, iOS, Web) with platform-specific configuration.
- The FCM HTTP v1 API is a REST API with secure authorization and flexible cross-platform messaging capabilities.
- Manage topic subscriptions for devices.

### Cloud Storage

Cloud Storage stores files such as images, videos, and audio as well as other user-generated content.

- Upload, list, fetch metadata and download URLs, copy, and delete files.
- Managed via the Google Cloud Storage JSON API, authenticated with Firebase credentials.

### Firebase App Management

The Firebase Management REST API exposes project apps and SDK configuration artifacts.

- List Android, iOS, and Web apps associated with a Firebase project.
- Retrieve an individual app by app ID or resource name.
- Download SDK configuration artifacts such as `google-services.json`, `GoogleService-Info.plist`, and Web app config metadata.

### Remote Config

Firebase Remote Config is a cloud service that lets you change the behavior and appearance of your client app or server without requiring users to download an app update.

- Read and publish Remote Config templates with parameters and conditions.
- You use the Firebase console or the Remote Config backend APIs to create parameters with the same names as the parameters used in your app. For each parameter, you can set a default value and conditional values to override for app instances that meet certain conditions.
- Supports version history and rollback.

### Cloud Functions Management

Cloud Functions for Firebase is a serverless framework that lets you automatically run backend code in response to events triggered by Firebase features and HTTPS requests.

- Deploy and manage serverless functions.
- Functions can be triggered by HTTP requests, database events, authentication events, storage events, and scheduled tasks.

## Events

Firebase does not natively support webhooks as similar services do. You can, however, replicate webhook-like behavior using Firebase Cloud Functions.

Firebase provides two built-in mechanisms for listening to changes:

### Realtime Database Streaming (Server-Sent Events)

Firebase REST endpoints support the EventSource / Server-Sent Events protocol, making it easy to stream changes to a single location in our Firebase database.

- Open a persistent HTTP connection to any database path by setting the `Accept` header to `text/event-stream`.
- The server may send the following five event types: put, patch, keep-alive, cancel, or auth_revoked.
- Can be scoped to any path in the database.
- Requires authentication (same as regular REST requests).

### Cloud Functions Event Triggers

Cloud Functions can be configured to trigger on various Firebase events and call external HTTP endpoints (acting as webhooks). Key event categories include:

- **Firestore Triggers**: Cloud Firestore event triggers let you create handlers tied to specific Cloud Firestore events. Supports document created, updated, deleted, and written events on specified document paths with wildcard support.
- **Realtime Database Triggers**: Fire when data is written, created, updated, or deleted at specified paths.
- **Authentication Triggers**: You can trigger functions in response to the creation and deletion of Firebase user accounts.
- **Cloud Storage Triggers**: Fire when objects are uploaded, deleted, or archived in a storage bucket.
- **Remote Config Triggers**: Fire when the Remote Config template is published/updated.
- **Firebase Alerts Triggers**: You can trigger functions in response to alert events emitted by these sources, including Crashlytics, Performance Monitoring, and App Distribution.

Note: Cloud Functions triggers require deploying function code to Firebase; they are not traditional webhook subscription endpoints. Firestore does not support a streaming/SSE protocol equivalent to the Realtime Database.

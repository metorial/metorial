# <img src="https://provider-logos.metorial-cdn.com/firebase.png" height="20"> Firebase

Manage backend services for mobile and web applications. Create, read, update, and delete documents in Cloud Firestore and Realtime Database. Manage user accounts including creating, updating, deleting, looking up, and listing users. Send push notifications and data messages to devices, topics, and conditions via Cloud Messaging (FCM). Upload, list, inspect, copy, and delete files in Cloud Storage. Read and publish Remote Config templates to change app behavior remotely. Discover Firebase Android, iOS, and Web apps and retrieve their SDK configuration artifacts.

## Tools

### Get Remote Config

Retrieve the current Firebase Remote Config template including all parameters, conditions, and parameter groups. Also supports listing version history for audit and rollback purposes.

### Get Firebase Apps

List Firebase Android, iOS, and Web apps in a project, retrieve a specific app, or download its SDK configuration artifact. Use this to discover app IDs, package or bundle identifiers, web config, and native google-services files.

### List Users

List Firebase Authentication users with pagination support. Returns user accounts with their properties including email, display name, and account status.

### Lookup User

Look up a Firebase Authentication user by email address or phone number. Useful for finding a user when you don't know their user ID.

### Manage Firestore Document

Create, read, update, or delete a document in Cloud Firestore. Supports setting document fields with automatic type encoding and specifying update masks for partial updates.

### Manage Realtime Database

Read, write, push, update, or delete data at any path in the Firebase Realtime Database. Supports querying with ordering, filtering, and pagination. Requires the **databaseUrl** to be configured in the project settings.

### Manage Cloud Storage

List, upload, get metadata, delete, or copy objects in Firebase Cloud Storage. Supports prefix-based listing for browsing folder-like structures, fetching download URLs, and copying objects between paths.

### Manage Topic Subscriptions

Subscribe or unsubscribe device tokens to/from FCM topics. Batch subscribe or unsubscribe multiple devices at once.

### Manage User

Create, update, delete, or retrieve a Firebase Authentication user. Supports managing user properties including email, password, display name, phone number, photo, email verification status, and account disabled state.

### Query Firestore

Query or list documents from a Cloud Firestore collection. Supports structured queries with field filters, ordering, and pagination. Use the simple list mode for browsing documents or the query mode for filtered searches.

### Send Push Notification

Send a push notification or data message via Firebase Cloud Messaging (FCM). Target individual devices by token, or broadcast to topics or conditions. Supports platform-specific configuration for Android, iOS (APNs), and Web.

### Update Remote Config

Publish an updated Firebase Remote Config template or roll back to a previous version. When publishing, provide the full template with parameters, conditions, and the current ETag. Use the "Get Remote Config" tool first to retrieve the current ETag.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>

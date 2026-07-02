# Slates Specification for AWS Cognito

## Overview

Amazon Cognito is an identity platform for web and mobile apps. It's a user directory, an authentication server, and an authorization service for OAuth 2.0 access tokens and AWS credentials. With Amazon Cognito, you can authenticate and authorize users from the built-in user directory, from your enterprise directory, and from consumer identity providers like Google and Facebook.

## Authentication

AWS Cognito's management API is authenticated using standard AWS IAM credentials. All API requests must be signed with AWS Signature Version 4.

**Required credentials:**

- **AWS Access Key ID** and **Secret Access Key**: IAM credentials with appropriate permissions for Cognito operations (e.g., `cognito-idp:*` for user pool operations, `cognito-identity:*` for identity pool operations).
- **AWS Region**: The region where your Cognito resources are located (e.g., `us-east-1`).

Amazon Cognito has three authorization models: IAM-authorized, public, and token-authorized. With IAM-authorized requests, the authorization comes from a signature by a set of AWS IAM credentials in the Authorization header of a request.

For server-side management operations (creating/updating user pools, managing users administratively), each request has an AWS Signature Version 4 authorization header signed with IAM machine credentials that were issued to the application server.

For integration purposes, you need:

1. An **IAM user or role** with permissions for Cognito API actions.
2. The **Access Key ID** and **Secret Access Key** for that IAM identity.
3. Optionally, a **Session Token** if using temporary credentials (e.g., from AWS STS).

There is no OAuth2-based authentication for the management API itself. The OAuth2/OIDC endpoints that Cognito exposes are for end-user authentication, not for managing Cognito resources programmatically.

## Features

### User Pool Management

Create and configure user pools, which serve as user directories. Configure password policies, MFA settings, account recovery options, and email/SMS verification. The Amazon Cognito identity store is an API-based user repository. The repository and APIs support the storage of up to 50 custom attributes per user, support for different data types, and enforce length and mutability constraints.

### User Management

Create, read, update, disable, and delete users within a user pool. Administrators can create users directly, confirm sign-ups, reset passwords, and manage user attributes. Users can sign up using an email, phone number, or username for your application. The self-registration process enables users to view and update their profile data, including custom attributes.

### Group Management

Create and manage groups within user pools. Assign users to groups for role-based access control. Groups can be associated with IAM roles for use with identity pools.

### Identity Provider Federation

User pools are a user directory with both self-service and administrator-driven user creation, management, and authentication. Your user pool can be an independent directory and OIDC identity provider (IdP), and an intermediate service provider (SP) to third-party providers of workforce and customer identities. Configure SAML 2.0, OIDC, and social identity providers (Google, Facebook, Apple, Amazon) as federated sign-in sources.

### App Client Configuration

Create and manage app clients that define how applications interact with a user pool. Configure authentication flows, OAuth scopes, callback URLs, and token expiration settings per client.

### Identity Pools (Federated Identities)

Set up an Amazon Cognito identity pool when you want to authorize authenticated or anonymous users to access your AWS resources. An identity pool issues AWS credentials for your app to serve resources to users. You can authenticate users with a trusted identity provider, like a user pool or a SAML 2.0 service. It can also optionally issue credentials for guest users. Identity pools use both role-based and attribute-based access control to manage your users' authorization to access your AWS resources.

### User Migration

Users can migrate into Amazon Cognito using either a batch import or just-in-time (JIT) migration. The batch user migration leverages a CSV file import process. Using the JIT migration process, an AWS Lambda trigger integrates the migration process into the sign-in workflow and can retain users' passwords.

### Token Customization

This Lambda trigger can add, remove, and modify some claims in identity and access tokens before Amazon Cognito issues them to your app. Customize ID and access tokens using pre token generation Lambda triggers to add custom claims, suppress claims, or modify scopes.

### Machine-to-Machine (M2M) Authorization

Using the OAuth Client Credential Flow, Amazon Cognito provides machine-to-machine authentication. Configure resource servers and custom scopes for API-to-API authorization without user involvement.

### Advanced Security

Using advanced security features for Amazon Cognito may help you protect access to user accounts in your applications. These advanced security features provide risk-based adaptive authentication and protection from the use of compromised credentials.

### Managed Login UI

Amazon Cognito provides both a customizable, pre-packaged, managed login interface to rapidly get to market and a robust set of APIs to build a fully custom self-registration solution. Developers can use a no-code visual editor to adjust how the end user screens (such as signup, login and MFA) appear.

## Events

The official AWS Cognito API does not have traditional webhooks. Instead, it uses AWS Lambda triggers to customize user pool workflows and respond to events.

AWS Cognito uses Lambda triggers to modify authentication behavior and customize user pool operations. These Lambda triggers are invoked at various stages of the authentication flow, allowing you to customize the behavior before, during, and after authentication events.

The following Lambda trigger categories are available:

### Sign-Up Events

- **Pre Sign-Up**: You might want to customize the sign-up process in user pools that have self-service sign-up options. Some common uses of the pre sign-up trigger are to perform custom analysis and recording of new users, apply security and governance standards, or link users from a third-party IdP to a consolidated user profile. Can auto-confirm users or auto-verify attributes.
- **Post Confirmation**: Triggered after a user is confirmed. Useful for sending welcome messages or syncing user data to external systems.

### Authentication Events

- **Pre Authentication**: Amazon Cognito invokes this trigger when a user attempts to sign in so that you can create custom validation that performs preparatory actions. For example, you can deny the authentication request or record session data to an external system.
- **Post Authentication**: Amazon Cognito invokes this Lambda after authentication is complete, before a user has received tokens. Add a post authentication trigger when you want to add custom post-processing of authentication events, for example logging or user profile adjustments that will be reflected on the next sign-in.

### Custom Authentication Challenge Events

- **Define Auth Challenge**, **Create Auth Challenge**, **Verify Auth Challenge Response**: As you build out your authentication flows, you might find that you want to extend your authentication model beyond the built-in flows. One common use case for the custom challenge triggers is to implement additional security checks beyond username, password, and MFA. A custom challenge is any question and response you can generate in a Lambda-supported programming language. For example, you might want to require users to solve a CAPTCHA or answer a security question before being allowed to authenticate.

### Token Generation Events

- **Pre Token Generation**: This Lambda trigger can add, remove, and modify some claims in identity and access tokens before Amazon Cognito issues them to your app. To use this feature, associate a Lambda function from the Amazon Cognito user pools console or update your user pool LambdaConfig.

### Message Customization Events

- **Custom Message**: A custom message Lambda trigger. This trigger is an opportunity to customize all SMS and email messages from your user pool. When a custom message trigger is active, your user pool routes all messages to a Lambda function that returns a runtime-customized message subject and body.
- **Custom Email Sender / Custom SMS Sender**: The Lambda triggers CustomEmailSender and CustomSMSSender support third-party email and SMS notifications in user pools. You can choose SMS and email providers to send notifications to users from within your Lambda function code.

### User Migration Events

- **User Migration**: Triggered when a user who does not exist in the user pool signs in or initiates password reset. Allows just-in-time migration from a legacy identity store, including preserving existing passwords.

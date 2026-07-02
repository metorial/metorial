# Slates Specification for MX Technologies

## Overview

MX Technologies is an open finance platform that connects applications to tens of thousands of financial institutions to aggregate, enhance, and verify financial data. MX helps organizations connect to financial data and turn raw, unstructured data into actionable assets to deliver intelligent and personalized money experiences. MX connects more than 13,000 financial institutions and fintechs.

## Authentication

All requests to the MX Platform API must use HTTPS (TLS v1.2 or higher) and include an Authorization header using Basic access authentication. The header format is: `Authorization: Basic <Base64(client_id:api_key)>`. Basic access authentication requires the Base64 encoding of the `client_id` and `api_key` separated by a colon.

For example, given credentials `CLIENT-1234` and `API-KEY-4567`:

- Concatenate: `CLIENT-1234:API-KEY-4567`
- Base64 encode: `Q0xJRU5ULTEyMzQ6QVBJLUtFWS00NTY3`
- Header: `Authorization: Basic Q0xJRU5ULTEyMzQ6QVBJLUtFWS00NTY3`

Retrieve your `client_id` and `api_key` from the Client Dashboard.

MX provides two environments: Production and Development (also called Integrations or INT). The development environment shares the same code base and provides the same features as the production environment.

- **Development base URL:** `https://int-api.mx.com`
- **Production base URL:** `https://api.mx.com`

The development environment limits developers to 100 users and access to only some of the top financial institutions. No user may have more than 25 members in either environment.

## Features

### Account Aggregation

MX's account aggregation solutions enable consumers to easily connect and view all of their financial accounts in one place — and give financial providers full visibility into consumer financial data. Users connect to financial institutions through "members," and MX aggregates account data including balances, transactions, and account details. MX automatically aggregates members in the background every 24 hours.

### Instant Account Verification (IAV)

MX reduces reliance on manual verification processes with instant account verifications (IAV) and account owner identification. Organizations can verify accounts in less than 5 seconds through direct OAuth connections. This verifies account and routing numbers for use cases like money movement and account funding.

### Account Owner Identification

Retrieve identity information about the account holder, including name, address, email, and phone number. This is useful for identity verification (IDV) and Know Your Customer (KYC) processes.

### Balance Checks

MX delivers instant account verifications, as well as account owner identification and rapid balance checks, to streamline processes. Balance checks allow organizations to verify account balances before processing payments.

### Transaction Data & Extended Transaction History

Access detailed transaction data from connected accounts. Extended transaction history enables retrieval of transactions beyond the default aggregation window, useful for underwriting and financial analysis.

### Statements

Retrieve account statements from connected financial institutions in PDF format.

### Data Enhancement (Off-Platform)

Data Enhancement Off Platform makes MX's categorization, cleansing, and classification services available to partners. You can group together a set of transactions and call the API. MX will categorize, cleanse, and classify the transactions and return that data. This also provides supplementary data such as merchant and merchant location information. This product does not persist or store transaction data on the MX platform.

### Microdeposits

Verify account details by making two small ACH deposits for end user confirmation. This serves as a fallback verification method when instant verification is unavailable.

### Financial Insights

Deliver dynamic, personalized, and predictive financial insights using widgets or API. Insights analyze user financial data to generate actionable recommendations.

### Investment Data Enhancement

Get enhanced investment holdings data and actionable insights into users' portfolios.

### Connect Widget

MX provides an embeddable UI widget that handles the end-user experience for connecting financial accounts. It supports credential-based and OAuth-based institution connections. Available for web, iOS, and Android.

### Reporting API

The Reporting API enables tracking changes for all users' data held on the MX platform without reading data individually for each user. It programmatically pulls MX's data into your system on a per-client basis and provides daily change files that indicate how objects have changed throughout the day. This data is requested by providing the date, resource, and action.

### User and Member Management

Create and manage users (representing end consumers) and members (representing connections between a user and a financial institution). Members can be created, updated, deleted, and have their credentials managed.

### Institution Search

Search and browse the catalog of supported financial institutions, including their supported features, credential requirements, and OAuth capabilities.

## Events

MX provides webhooks that send HTTPS POST callback requests to the URL of your choice. This enables you to subscribe to certain events, be notified when those events occur, and have information related to events delivered to you.

For Platform API clients, only the aggregation, balance, connection status, history, insights, and statements webhooks are available. Additional webhook types are available depending on integration type.

### Aggregation

Triggered when an aggregation job completes, providing updated account and transaction data from a connected institution.

### Balance

Triggered when a balance check job completes for a member.

### Connection Status

Triggered when the connection status of a member changes (e.g., connected, disconnected, requires re-authentication).

### History (Extended Transaction History)

Triggered when an extended transaction history job completes.

### Insights

Triggered when new financial insights are generated for a user.

### Statements

Triggered when statement retrieval completes for a member.

### Verification

Triggered when an account verification (IAV) job completes.

### Microdeposits

Triggered on status changes related to microdeposit verification flows.

### Job Status

Triggered on status changes for any asynchronous job running on the MX platform.

### Member

Triggered when a member object is created or updated.

### Accounts

Triggered when account data changes for a user's connected accounts.

### Transactions

Triggered when new or updated transactions are available.

### Holdings

Triggered when investment holdings data changes.

### Users

Triggered when a user object is created or updated.

### Initial Data Ready

Triggered when the first aggregation for a new member completes and initial data is available.

### Budgets

Triggered when budget-related data changes for a user.

### Categories

Triggered when category data changes.

### Goals

Triggered when goal-related data changes for a user.

### Spending Plan

Triggered when spending plan data changes.

### Tags & Taggings

Triggered when tag or tagging data changes.

### Notifications

Triggered when MX-generated notifications are created for a user.

# Firebase Cloud Messaging (FCM) Notification Service Documentation

## Overview

This service provides APIs for:

- Subscribing users to FCM topics
- Unsubscribing users from FCM topics
- Sending notifications to topics
- Sending notifications to individual users

The service is built using:

- Express.js
- TypeScript
- Firebase Admin SDK

---

# Initialization

## Imports

```ts
import express from "express";
import firebaseApp from "./firebase/firebaseConfig.ts";
import { getMessaging, type BatchResponse } from "firebase-admin/messaging";
import FCMTokenRepository from "./repository/FCMToken.repository.ts";
import type { MessagingTopicManagementResponse } from "firebase-admin/messaging";
```

---

## Firebase Messaging Instance

```ts
const messaging = getMessaging(firebaseApp);
```

---

## Express Application

```ts
const app = express();

app.use(express.json());
```

---

# API Endpoints

---

# 1. Subscribe User to Topic

## Endpoint

```http
POST /subscribe
```

---

## Request Body

```json
{
  "userId": 1,
  "topic": "news"
}
```

---

## Validation

- `topic` is required
- `userId` is required
- `userId` must be a number
- `topic` must be a string

---

## Process Flow

### Fetch User Tokens

```ts
const FCMTokens = await FCMTokenRepository.getByUserId(userId);
```

---

### Extract Existing Topics

```ts
const topics = FCMTokens.map((FCMToken) => FCMToken.topic.split(","));
```

---

### Create Topic Set

```ts
const topicsSet = new Set(topics.flat());
topicsSet.add(topic.toLowerCase());
```

---

### Update Topics

```ts
await FCMTokenRepository.updateTopicsByUserId(userId, topicsSet);
```

---

### Subscribe Tokens to Topic

```ts
const response: MessagingTopicManagementResponse =
  await messaging.subscribeToTopic(
    FCMTokens.map((FCMToken) => FCMToken.token),
    topic.toLowerCase(),
  );
```

---

## Success Response

```json
{
  "success": true,
  "response": {
    "successCount": 2,
    "failureCount": 0
  }
}
```

---

## Error Response

```json
{
  "success": false,
  "error": "Error message"
}
```

---

# 2. Unsubscribe User from Topic

## Endpoint

```http
POST /unsubscribe
```

---

## Request Body

```json
{
  "userId": 1,
  "topic": "news"
}
```

---

## Process Flow

### Fetch User Tokens

```ts
const FCMTokens = await FCMTokenRepository.getByUserId(userId);
```

---

### Extract Existing Topics

```ts
const topics = FCMTokens.map((FCMToken) => FCMToken.topic.split(","));
```

---

### Remove Topic

```ts
const topicsSet = new Set(topics.flat());
topicsSet.delete(topic.toLowerCase());
```

---

### Update Topics

```ts
await FCMTokenRepository.updateTopicsByUserId(userId, topicsSet);
```

---

### Unsubscribe Tokens from Topic

```ts
const response: MessagingTopicManagementResponse =
  await messaging.unsubscribeFromTopic(
    FCMTokens.map((FCMToken) => FCMToken.token),
    topic.toLowerCase(),
  );
```

---

## Success Response

```json
{
  "success": true,
  "response": {
    "successCount": 2,
    "failureCount": 0
  }
}
```

---

## Error Response

```json
{
  "success": false,
  "error": "Error message"
}
```

---

# 3. Send Notification to Topic

## Endpoint

```http
POST /send-topic
```

---

## Request Body

```json
{
  "topic": "news",
  "title": "Title",
  "body": "Body"
}
```

---

## Message Payload

```ts
const message = {
  notification: {
    title,
    body,
  },
  topic,
};
```

---

## Send Notification

```ts
const response = await messaging.send(message);
```

---

## Success Response

```json
{
  "success": true,
  "messageId": "projects/project-id/messages/message-id"
}
```

---

## Error Response

```json
{
  "success": false,
  "error": "Error message"
}
```

---

# 4. Send Notifications to Individual Users

## Endpoint

```http
POST /send-indiviuals
```

---

## Request Body

```json
{
  "userIds": [1, 2, 3],
  "title": "Title",
  "body": "Body"
}
```

---

## Validation

- `userIds` must be a non-empty array
- `title` is required
- `body` is required
- `title` must be a string
- `body` must be a string

---

## Process Flow

### Fetch Tokens

```ts
const FCMTokens = await FCMTokenRepository.getManyByUserIds(userIds);
```

---

### Create Multicast Message

```ts
const message = {
  notification: {
    title,
    body,
  },
  tokens: FCMTokens.map((FCMToken) => FCMToken.token),
};
```

---

### Send Notifications

```ts
response = await messaging.sendEachForMulticast(message);
```

---

### Collect Failed Tokens

```ts
if (response.failureCount > 0) {
  response.responses.forEach((resp, idx) => {
    if (!resp.success) {
      failedTokens.push({
        token: FCMTokens[idx].token,
        reason: resp.error,
        id: FCMTokens[idx].id,
      });
    }
  });
}
```

---

## Success Response

```json
{
  "success": true,
  "messageId": {
    "successCount": 5,
    "failureCount": 1
  },
  "failedUserIds": [
    {
      "token": "invalid_token",
      "reason": {},
      "id": 15
    }
  ]
}
```

---

## Error Response

```json
{
  "success": false,
  "error": "Error message"
}
```

---

# Repository Methods

## getByUserId

```ts
FCMTokenRepository.getByUserId(userId);
```

Returns all FCM tokens associated with a user.

---

## getManyByUserIds

```ts
FCMTokenRepository.getManyByUserIds(userIds);
```

Returns all FCM tokens associated with multiple users.

---

## updateTopicsByUserId

```ts
FCMTokenRepository.updateTopicsByUserId(userId, topicsSet);
```

Updates topic list for a user.

---

# Server Configuration

## Port

```ts
const PORT = 3000;
```

---

## Start Server

```ts
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

# Expected Token Structure

```ts
{
  id: number;
  token: string;
  topic: string;
}
```

---

# Firebase Message Types

## Topic Message

```ts
{
  notification: {
    title: string,
    body: string
  },
  topic: string
}
```

---

## Multicast Message

```ts
{
  notification: {
    title: string,
    body: string
  },
  tokens: string[]
}
```

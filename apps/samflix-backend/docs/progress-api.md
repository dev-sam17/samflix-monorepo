# Video Resume Progress API Documentation

This document provides details on the video resume playback feature API endpoints. These endpoints allow you to save, retrieve, and delete video playback progress for users.

## Base URL

All endpoints are prefixed with `/api/progress`.

## Data Model

The progress data is stored in Redis with the following structure:

```
Key: resume:{clerkId}:{tmdbId}
Value: {
  currentTime: number,
  updatedAt: string (ISO format)
}
```

## Endpoints

### Save Progress

Saves or updates the playback progress for a specific user and video.

- **URL**: `/api/progress`
- **Method**: `POST`
- **Auth Required**: Yes
- **Content-Type**: `application/json`

**Request Body**:

```json
{
  "clerkId": "user_123456",
  "tmdbId": "12345",
  "currentTime": 3600
}
```

| Parameter    | Type   | Description                                 |
|--------------|--------|---------------------------------------------|
| clerkId      | string | The unique identifier for the user          |
| tmdbId       | string | The TMDB ID of the video                    |
| currentTime  | number | The current playback position in seconds    |

**Response**:

- **Status Code**: 204 No Content (Success)
- **Error Codes**:
  - 400: Bad Request (Missing or invalid parameters)
  - 500: Server Error

### Get Progress for a Specific Video

Retrieves the playback progress for a specific user and video.

- **URL**: `/api/progress/:clerkId/:tmdbId`
- **Method**: `GET`
- **Auth Required**: Yes

**URL Parameters**:

| Parameter | Type   | Description                              |
|-----------|--------|------------------------------------------|
| clerkId   | string | The unique identifier for the user       |
| tmdbId    | string | The TMDB ID of the video                 |

**Response**:

- **Status Code**: 200 OK
- **Content-Type**: `application/json`

```json
{
  "currentTime": 3600,
  "updatedAt": "2025-07-30T09:23:45.678Z"
}
```

- **Error Codes**:
  - 404: Not Found (No progress data for this user and video)
  - 500: Server Error

### Get All Progress for a User

Retrieves all playback progress entries for a specific user.

- **URL**: `/api/progress/:clerkId`
- **Method**: `GET`
- **Auth Required**: Yes

**URL Parameters**:

| Parameter | Type   | Description                              |
|-----------|--------|------------------------------------------|
| clerkId   | string | The unique identifier for the user       |

**Response**:

- **Status Code**: 200 OK
- **Content-Type**: `application/json`

```json
[
  {
    "tmdbId": "12345",
    "currentTime": 3600,
    "updatedAt": "2025-07-30T09:23:45.678Z"
  },
  {
    "tmdbId": "67890",
    "currentTime": 1800,
    "updatedAt": "2025-07-30T08:15:30.123Z"
  }
]
```

- **Error Codes**:
  - 500: Server Error

### Delete Progress

Deletes the playback progress for a specific user and video.

- **URL**: `/api/progress/:clerkId/:tmdbId`
- **Method**: `DELETE`
- **Auth Required**: Yes

**URL Parameters**:

| Parameter | Type   | Description                              |
|-----------|--------|------------------------------------------|
| clerkId   | string | The unique identifier for the user       |
| tmdbId    | string | The TMDB ID of the video                 |

**Response**:

- **Status Code**: 204 No Content (Success)
- **Error Codes**:
  - 404: Not Found (No progress data for this user and video)
  - 500: Server Error

## Error Responses

All endpoints may return the following error responses:

```json
{
  "error": "Error message description"
}
```

For validation errors, the response will include additional details:

```json
{
  "error": "Validation failed",
  "details": {
    // Validation error details
  }
}
```

## Notes

- All progress data has a Time-To-Live (TTL) of 30 days, after which it will be automatically deleted from Redis.
- The `currentTime` value is stored in seconds.
- The `updatedAt` timestamp is in ISO format and represents when the progress was last updated.

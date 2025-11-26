# Samflix Backend API Documentation

## Base URL
`https://api.samflix.com/v1`

## Authentication
All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <your_token>
```

## Movies

### Get All Movies
`GET /movies`

**Request:**
```
curl -X GET 'https://api.samflix.com/v1/movies' \
  -H 'Authorization: Bearer <your_token>'
```

**Response:**
```json
{
  "data": [
    {
      "id": "string",
      "title": "string",
      "year": 2023,
      "genres": ["string"],
      "posterUrl": "string"
    }
  ],
  "pagination": {
    "total": 0,
    "page": 1,
    "limit": 20
  }
}
```

### Get Movie by ID
`GET /movies/:id`

**Request:**
```
curl -X GET 'https://api.samflix.com/v1/movies/123' \
  -H 'Authorization: Bearer <your_token>'
```

**Response:**
```json
{
  "id": "string",
  "title": "string",
  "year": 2023,
  "genres": ["string"],
  "description": "string",
  "duration": 120,
  "posterUrl": "string",
  "backdropUrl": "string"
}
```

### Search Movies
`GET /movies/search/:query`

**Request:**
```
curl -X GET 'https://api.samflix.com/v1/movies/search/avengers' \
  -H 'Authorization: Bearer <your_token>'
```

**Response:**
```json
{
  "data": [
    {
      "id": "string",
      "title": "string",
      "year": 2023,
      "genres": ["string"],
      "posterUrl": "string"
    }
  ],
  "pagination": {
    "total": 0,
    "page": 1,
    "limit": 20
  }
}
```

### Get Movies by Genre
`GET /movies/genre/:genre`

**Request:**
```
curl -X GET 'https://api.samflix.com/v1/movies/genre/action' \
  -H 'Authorization: Bearer <your_token>'
```

**Response:**
```json
{
  "data": [
    {
      "id": "string",
      "title": "string",
      "year": 2023,
      "genres": ["string"],
      "posterUrl": "string"
    }
  ],
  "pagination": {
    "total": 0,
    "page": 1,
    "limit": 20
  }
}
```

### Get All Genres
`GET /movies/genres/all`

**Request:**
```
curl -X GET 'https://api.samflix.com/v1/movies/genres/all' \
  -H 'Authorization: Bearer <your_token>'
```

**Response:**
```json
[
  "Action",
  "Comedy",
  "Drama",
  "Sci-Fi"
]
```

## Series

### Get All Series
`GET /series`

**Request:**
```
curl -X GET 'https://api.samflix.com/v1/series' \
  -H 'Authorization: Bearer <your_token>'
```

**Response:**
```json
{
  "data": [
    {
      "id": "string",
      "title": "string",
      "year": 2023,
      "genres": ["string"],
      "posterUrl": "string"
    }
  ],
  "pagination": {
    "total": 0,
    "page": 1,
    "limit": 20
  }
}
```

### Get Series by ID
`GET /series/:id`

**Request:**
```
curl -X GET 'https://api.samflix.com/v1/series/123' \
  -H 'Authorization: Bearer <your_token>'
```

**Response:**
```json
{
  "id": "string",
  "title": "string",
  "year": 2023,
  "genres": ["string"],
  "description": "string",
  "seasons": 3,
  "posterUrl": "string",
  "backdropUrl": "string"
}
```

### Search Series
`GET /series/search/:query`

**Request:**
```
curl -X GET 'https://api.samflix.com/v1/series/search/stranger' \
  -H 'Authorization: Bearer <your_token>'
```

**Response:**
```json
{
  "data": [
    {
      "id": "string",
      "title": "string",
      "year": 2023,
      "genres": ["string"],
      "posterUrl": "string"
    }
  ],
  "pagination": {
    "total": 0,
    "page": 1,
    "limit": 20
  }
}
```

### Get Episodes by Season
`GET /series/:seriesId/season/:seasonNumber`

**Request:**
```
curl -X GET 'https://api.samflix.com/v1/series/123/season/1' \
  -H 'Authorization: Bearer <your_token>'
```

**Response:**
```json
{
  "data": [
    {
      "id": "string",
      "title": "string",
      "season": 1,
      "episode": 1,
      "description": "string",
      "duration": 60,
      "posterUrl": "string"
    }
  ]
}
```

### Get Series by Genre
`GET /series/genre/:genre`

**Request:**
```
curl -X GET 'https://api.samflix.com/v1/series/genre/drama' \
  -H 'Authorization: Bearer <your_token>'
```

**Response:**
```json
{
  "data": [
    {
      "id": "string",
      "title": "string",
      "year": 2023,
      "genres": ["string"],
      "posterUrl": "string"
    }
  ],
  "pagination": {
    "total": 0,
    "page": 1,
    "limit": 20
  }
}
```

### Get Episode
`GET /series/:seriesId/season/:seasonNumber/episode/:episodeNumber`

**Request:**
```
curl -X GET 'https://api.samflix.com/v1/series/123/season/1/episode/1' \
  -H 'Authorization: Bearer <your_token>'
```

**Response:**
```json
{
  "id": "string",
  "title": "string",
  "season": 1,
  "episode": 1,
  "description": "string",
  "duration": 60,
  "posterUrl": "string"
}
```

### Get All Genres
`GET /series/genres/all`

**Request:**
```
curl -X GET 'https://api.samflix.com/v1/series/genres/all' \
  -H 'Authorization: Bearer <your_token>'
```

**Response:**
```json
[
  "Action",
  "Comedy",
  "Drama",
  "Sci-Fi"
]
```

## Streaming

### Stream Movie (HLS)
`GET /stream/movies/:id/hls`

**Request:**
```
curl -X GET 'https://api.samflix.com/v1/stream/movies/123/hls' \
  -H 'Authorization: Bearer <your_token>'
```

**Response:**
```json
{
  "hlsUrl": "string"
}
```

### Serve Movie Segment (HLS)
`GET /stream/movies/:id/hls/:filename`

**Request:**
```
curl -X GET 'https://api.samflix.com/v1/stream/movies/123/hls/segment.m3u8' \
  -H 'Authorization: Bearer <your_token>'
```

**Response:**
```json
{
  "segment": "string"
}
```

### Stream Episode (HLS)
`GET /stream/episodes/:id/hls`

**Request:**
```
curl -X GET 'https://api.samflix.com/v1/stream/episodes/123/hls' \
  -H 'Authorization: Bearer <your_token>'
```

**Response:**
```json
{
  "hlsUrl": "string"
}
```

### Serve Episode Segment (HLS)
`GET /stream/episodes/:id/hls/:filename`

**Request:**
```
curl -X GET 'https://api.samflix.com/v1/stream/episodes/123/hls/segment.m3u8' \
  -H 'Authorization: Bearer <your_token>'
```

**Response:**
```json
{
  "segment": "string"
}
```

### Download Movie
`GET /stream/movies/:id/download`

**Request:**
```
curl -X GET 'https://api.samflix.com/v1/stream/movies/123/download' \
  -H 'Authorization: Bearer <your_token>'
```

**Response:**
```json
{
  "downloadUrl": "string"
}
```

### Download Episode
`GET /stream/episodes/:id/download`

**Request:**
```
curl -X GET 'https://api.samflix.com/v1/stream/episodes/123/download' \
  -H 'Authorization: Bearer <your_token>'
```

**Response:**
```json
{
  "downloadUrl": "string"
}
```

## Webhooks

### Clerk Webhook
`POST /webhook/clerk`

**Request:**
```json
{
  "event": "string",
  "data": {
    "id": "string",
    "title": "string",
    "year": 2023,
    "genres": ["string"],
    "posterUrl": "string"
  }
}
```

**Response:**
```json
{
  "success": true
}
```

## Scanner

### Start Manual Scan
`GET /scanner/scan` (Server-Sent Events)

**Request:**
```
curl -X GET 'https://api.samflix.com/v1/scanner/scan' \
  -H 'Authorization: Bearer <your_token>'
```

**Response:**
```json
{
  "event": "string",
  "data": {
    "id": "string",
    "title": "string",
    "year": 2023,
    "genres": ["string"],
    "posterUrl": "string"
  }
}
```

### Add Media Folder
`POST /scanner/folders`

**Request:**
```json
{
  "path": "string"
}
```

**Response:**
```json
{
  "id": "string",
  "path": "string"
}
```

### Get All Media Folders
`GET /scanner/folders`

**Request:**
```
curl -X GET 'https://api.samflix.com/v1/scanner/folders' \
  -H 'Authorization: Bearer <your_token>'
```

**Response:**
```json
[
  {
    "id": "string",
    "path": "string"
  }
]
```

### Update Media Folder Status
`PATCH /scanner/folders/:id`

**Request:**
```json
{
  "status": "string"
}
```

**Response:**
```json
{
  "id": "string",
  "path": "string",
  "status": "string"
}
```

### Delete Media Folder
`DELETE /scanner/folders/:id`

**Request:**
```
curl -X DELETE 'https://api.samflix.com/v1/scanner/folders/123' \
  -H 'Authorization: Bearer <your_token>'
```

**Response:**
```json
{
  "success": true
}
```

### Get Scanning Conflicts
`GET /scanner/conflicts`

**Request:**
```
curl -X GET 'https://api.samflix.com/v1/scanner/conflicts' \
  -H 'Authorization: Bearer <your_token>'
```

**Response:**
```json
[
  {
    "id": "string",
    "title": "string",
    "year": 2023,
    "genres": ["string"],
    "posterUrl": "string"
  }
]
```

### Resolve Scanning Conflict
`POST /scanner/conflicts/:id/resolve`

**Request:**
```json
{
  "resolution": "string"
}
```

**Response:**
```json
{
  "success": true
}
```

### Delete Scanning Conflict
`DELETE /scanner/conflicts/:id`

**Request:**
```
curl -X DELETE 'https://api.samflix.com/v1/scanner/conflicts/123' \
  -H 'Authorization: Bearer <your_token>'
```

**Response:**
```json
{
  "success": true
}
```

### Delete All Scanning Conflicts
`DELETE /scanner/conflicts`

**Request:**
```
curl -X DELETE 'https://api.samflix.com/v1/scanner/conflicts' \
  -H 'Authorization: Bearer <your_token>'
```

**Response:**
```json
{
  "success": true
}
```

## Transcode

### Update Movie Transcode Status
`PUT /transcode/movie/:id`

**Request:**
```
curl -X PUT 'https://api.samflix.com/v1/transcode/movie/123' \
  -H 'Authorization: Bearer <your_token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "status": "COMPLETED"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Movie transcode status updated successfully",
  "data": {
    "id": "string",
    "title": "string",
    "transcodeStatus": "COMPLETED"
  }
}
```

### Update Episode Transcode Status
`PUT /transcode/episode/:id`

**Request:**
```
curl -X PUT 'https://api.samflix.com/v1/transcode/episode/123' \
  -H 'Authorization: Bearer <your_token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "status": "COMPLETED"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Episode transcode status updated successfully",
  "data": {
    "id": "string",
    "title": "string",
    "transcodeStatus": "COMPLETED"
  }
}
```

### Get All Items by Transcode Status
`GET /transcode/status/:status`

**Request:**
```
curl -X GET 'https://api.samflix.com/v1/transcode/status/PENDING' \
  -H 'Authorization: Bearer <your_token>'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "movies": [
      {
        "id": "string",
        "title": "string",
        "transcodeStatus": "PENDING"
      }
    ],
    "episodes": [
      {
        "id": "string",
        "title": "string",
        "transcodeStatus": "PENDING"
      }
    ]
  }
}
```

### Get Movies by Transcode Status
`GET /transcode/movies/status/:status`

**Request:**
```
curl -X GET 'https://api.samflix.com/v1/transcode/movies/status/PENDING' \
  -H 'Authorization: Bearer <your_token>'
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "title": "string",
      "transcodeStatus": "PENDING"
    }
  ]
}
```

### Get Episodes by Transcode Status
`GET /transcode/episodes/status/:status`

**Request:**
```
curl -X GET 'https://api.samflix.com/v1/transcode/episodes/status/PENDING' \
  -H 'Authorization: Bearer <your_token>'
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "title": "string",
      "transcodeStatus": "PENDING"
    }
  ]
}
```

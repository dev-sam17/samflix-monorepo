# Genre API Documentation

This document provides comprehensive API documentation for all genre-related endpoints in the Samflix backend.

## Base URL
```
http://localhost:3000/api
```

## Authentication
Currently, no authentication is required for these endpoints.

## Caching
All GET requests are cached for **1 hour (3600 seconds)** to improve performance. Cache is automatically invalidated when data is modified.

---

## 📽️ Movie Genre Endpoints

### 1. Get All Movie Genres

**Endpoint:** `GET /api/movies/genres/all`

**Description:** Retrieves a list of all unique genres available for movies.

**Request:**
```http
GET /api/movies/genres/all
```

**Response:**
```json
[
  "Action",
  "Adventure", 
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "Horror",
  "Romance",
  "Sci-Fi",
  "Thriller"
]
```

**Response Details:**
- **Status Code:** `200 OK`
- **Content-Type:** `application/json`
- **Data Type:** Array of strings
- **Sorting:** Alphabetical order

**Error Responses:**
```json
// 500 Internal Server Error
{
  "error": "Failed to fetch genres"
}
```

---

### 2. Get Movies by Genre

**Endpoint:** `GET /api/movies/genre/:genre`

**Description:** Retrieves all movies that belong to a specific genre.

**Parameters:**
- `genre` (path parameter, required): The genre name (case-sensitive)

**Request:**
```http
GET /api/movies/genre/Action
```

**Response:**
```json
[
  {
    "id": "movie_123",
    "title": "Action Movie Title",
    "overview": "Movie description...",
    "releaseDate": "2023-01-15T00:00:00.000Z",
    "runtime": 120,
    "genres": ["Action", "Adventure"],
    "posterPath": "/path/to/poster.jpg",
    "backdropPath": "/path/to/backdrop.jpg",
    "voteAverage": 7.5,
    "voteCount": 1250,
    "popularity": 85.6,
    "adult": false,
    "originalLanguage": "en",
    "originalTitle": "Original Action Movie Title",
    "video": false,
    "tmdbId": 12345,
    "imdbId": "tt1234567",
    "tagline": "Action-packed adventure",
    "status": "Released",
    "budget": 50000000,
    "revenue": 150000000,
    "homepage": "https://movie-homepage.com",
    "transcodeStatus": "COMPLETED",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
]
```

**Response Details:**
- **Status Code:** `200 OK`
- **Content-Type:** `application/json`
- **Data Type:** Array of Movie objects
- **Sorting:** Alphabetical by title (ascending)

**Error Responses:**
```json
// 400 Bad Request
{
  "error": "Genre parameter is required"
}

// 500 Internal Server Error
{
  "error": "Failed to fetch movies by genre"
}
```

---

## 📺 TV Series Genre Endpoints

### 3. Get All TV Series Genres

**Endpoint:** `GET /api/series/genres/all`

**Description:** Retrieves a list of all unique genres available for TV series.

**Request:**
```http
GET /api/series/genres/all
```

**Response:**
```json
[
  "Action & Adventure",
  "Animation",
  "Comedy", 
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Kids",
  "Mystery",
  "Reality",
  "Sci-Fi & Fantasy",
  "Soap",
  "Talk",
  "War & Politics",
  "Western"
]
```

**Response Details:**
- **Status Code:** `200 OK`
- **Content-Type:** `application/json`
- **Data Type:** Array of strings
- **Sorting:** Alphabetical order

**Error Responses:**
```json
// 500 Internal Server Error
{
  "error": "Failed to fetch genres"
}
```

---

### 4. Get TV Series by Genre

**Endpoint:** `GET /api/series/genre/:genre`

**Description:** Retrieves all TV series that belong to a specific genre.

**Parameters:**
- `genre` (path parameter, required): The genre name (case-sensitive)

**Request:**
```http
GET /api/series/genre/Drama
```

**Response:**
```json
[
  {
    "id": "series_456",
    "title": "Drama Series Title",
    "overview": "Series description...",
    "firstAirDate": "2023-01-15T00:00:00.000Z",
    "lastAirDate": "2023-12-15T00:00:00.000Z",
    "genres": ["Drama", "Mystery"],
    "posterPath": "/path/to/poster.jpg",
    "backdropPath": "/path/to/backdrop.jpg",
    "voteAverage": 8.2,
    "voteCount": 2500,
    "popularity": 92.3,
    "adult": false,
    "originalLanguage": "en",
    "originalName": "Original Drama Series Title",
    "tmdbId": 67890,
    "imdbId": "tt7654321",
    "tagline": "Gripping drama series",
    "status": "Ended",
    "type": "Scripted",
    "homepage": "https://series-homepage.com",
    "inProduction": false,
    "numberOfEpisodes": 50,
    "numberOfSeasons": 5,
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z",
    "seasons": [
      {
        "id": "season_1",
        "seasonNumber": 1,
        "name": "Season 1",
        "overview": "First season overview...",
        "airDate": "2023-01-15T00:00:00.000Z",
        "episodeCount": 10,
        "posterPath": "/path/to/season1-poster.jpg"
      }
    ]
  }
]
```

**Response Details:**
- **Status Code:** `200 OK`
- **Content-Type:** `application/json`
- **Data Type:** Array of TV Series objects (includes seasons)
- **Sorting:** Alphabetical by title (ascending)

**Error Responses:**
```json
// 400 Bad Request
{
  "error": "Genre parameter is required"
}

// 500 Internal Server Error
{
  "error": "Failed to fetch series by genre"
}
```

---

## 🔧 Frontend Integration Examples

### React/Next.js Examples

#### Fetch All Movie Genres
```javascript
const fetchMovieGenres = async () => {
  try {
    const response = await fetch('/api/movies/genres/all');
    const genres = await response.json();
    return genres;
  } catch (error) {
    console.error('Error fetching movie genres:', error);
    return [];
  }
};
```

#### Fetch Movies by Genre
```javascript
const fetchMoviesByGenre = async (genre) => {
  try {
    const response = await fetch(`/api/movies/genre/${encodeURIComponent(genre)}`);
    const movies = await response.json();
    return movies;
  } catch (error) {
    console.error('Error fetching movies by genre:', error);
    return [];
  }
};
```

#### Fetch All TV Series Genres
```javascript
const fetchSeriesGenres = async () => {
  try {
    const response = await fetch('/api/series/genres/all');
    const genres = await response.json();
    return genres;
  } catch (error) {
    console.error('Error fetching series genres:', error);
    return [];
  }
};
```

#### Fetch TV Series by Genre
```javascript
const fetchSeriesByGenre = async (genre) => {
  try {
    const response = await fetch(`/api/series/genre/${encodeURIComponent(genre)}`);
    const series = await response.json();
    return series;
  } catch (error) {
    console.error('Error fetching series by genre:', error);
    return [];
  }
};
```

### React Hook Example
```javascript
import { useState, useEffect } from 'react';

const useGenres = (type = 'movies') => {
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        setLoading(true);
        const endpoint = type === 'movies' 
          ? '/api/movies/genres/all' 
          : '/api/series/genres/all';
        
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Failed to fetch genres');
        
        const data = await response.json();
        setGenres(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGenres();
  }, [type]);

  return { genres, loading, error };
};
```

---

## 📝 Notes

### Genre Naming Conventions
- **Movies:** Use standard movie genre names (e.g., "Action", "Comedy", "Drama")
- **TV Series:** May include compound genres (e.g., "Action & Adventure", "Sci-Fi & Fantasy")

### URL Encoding
Always URL-encode genre names when making requests, especially for genres with special characters or spaces:
```javascript
const genre = "Action & Adventure";
const encodedGenre = encodeURIComponent(genre);
// Results in: "Action%20%26%20Adventure"
```

### Caching Behavior
- All GET requests are cached for 1 hour
- Cache is automatically cleared when any POST/PUT/PATCH/DELETE request is made
- For real-time updates, consider implementing WebSocket connections or polling

### Error Handling
Always implement proper error handling in your frontend code to gracefully handle:
- Network errors
- Server errors (500)
- Invalid parameters (400)
- Empty results

### Performance Considerations
- Genre lists are typically small and change infrequently
- Consider caching genre lists in your frontend application
- Use the genre endpoints to build navigation menus and filters
- Implement pagination for large result sets when fetching content by genre

---

## 🚀 Quick Start Checklist

1. **Test the endpoints** using curl or Postman
2. **Implement error handling** in your frontend code  
3. **Cache genre lists** in your application state
4. **URL encode** genre parameters properly
5. **Handle loading states** for better UX
6. **Implement retry logic** for failed requests

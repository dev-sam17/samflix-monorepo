# Storage API Documentation

This document provides comprehensive documentation for the Storage API endpoints in the Samflix Backend service. The Storage API provides functionality to monitor disk usage for media content, including raw media files and HLS-compatible media.

## Base URL
```
http://localhost:3000/api/storage
```

## Overview

The Storage API allows you to:
- Get detailed storage statistics for media content
- Update total disk space configuration
- Force disk usage scans
- Monitor scanning status
- Automatically scan disk usage every 24 hours via cron job

## Endpoints

### 1. Get Storage Statistics

Retrieves comprehensive storage statistics including disk usage for raw media files and HLS media.

**Endpoint:** `GET /api/storage/stats`

**Description:** Returns storage statistics with breakdown of space occupied by different media types.

**Response Format:**
```json
{
  "totalSpaceOccupied": "1.2 GB",
  "spaceOccupiedByRawMedia": "800 MB", 
  "spaceOccupiedByHlsMedia": "400 MB",
  "totalDiskSpace": "4TB",
  "lastScanTime": "2024-01-15T10:30:00.000Z",
  "cached": true
}
```

**Response Fields:**
- `totalSpaceOccupied` (string): Total space used by all media content (formatted)
- `spaceOccupiedByRawMedia` (string): Space used by raw media files (.mp4, .mkv, .m4a, etc.)
- `spaceOccupiedByHlsMedia` (string): Space used by HLS folders and segments
- `totalDiskSpace` (string): Configured total disk space
- `lastScanTime` (string|null): Timestamp of last disk scan
- `cached` (boolean): Whether the data was retrieved from cache

**Status Codes:**
- `200 OK`: Successfully retrieved storage statistics
- `500 Internal Server Error`: Failed to fetch storage statistics

**Example Request:**
```bash
curl -X GET http://localhost:3000/api/storage/stats
```

**Example Response:**
```json
{
  "totalSpaceOccupied": "1.2 GB",
  "spaceOccupiedByRawMedia": "800 MB",
  "spaceOccupiedByHlsMedia": "400 MB", 
  "totalDiskSpace": "4TB",
  "lastScanTime": "2024-01-15T10:30:00.000Z",
  "cached": true
}
```

**Caching:**
- Results are cached for 1 hour
- Cache is automatically invalidated when disk space is updated or force scan is performed

---

### 2. Update Total Disk Space

Updates the total disk space configuration setting.

**Endpoint:** `POST /api/storage/update-disk-space`

**Description:** Updates the total disk space setting used in storage statistics.

**Request Body:**
```json
{
  "totalDiskSpace": "4TB"
}
```

**Request Fields:**
- `totalDiskSpace` (string, required): Total disk space in format like "4TB", "500GB", "1.5TB"

**Response Format:**
```json
{
  "message": "Total disk space updated successfully",
  "totalDiskSpace": "4TB"
}
```

**Status Codes:**
- `200 OK`: Successfully updated disk space
- `400 Bad Request`: Invalid request body or disk space format
- `500 Internal Server Error`: Failed to update disk space

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/storage/update-disk-space \
  -H "Content-Type: application/json" \
  -d '{"totalDiskSpace": "8TB"}'
```

**Example Response:**
```json
{
  "message": "Total disk space updated successfully",
  "totalDiskSpace": "8TB"
}
```

**Validation:**
- Disk space format must match pattern: `^\d+(\.\d+)?\s*(B|KB|MB|GB|TB|PB)$`
- Examples of valid formats: "4TB", "500GB", "1.5TB", "2048 MB"

---

### 3. Force Disk Scan

Initiates a manual disk usage scan, bypassing the scheduled scan.

**Endpoint:** `POST /api/storage/force-scan`

**Description:** Forces an immediate disk usage scan and clears existing cache.

**Request Body:** None required

**Response Format:**
```json
{
  "message": "Disk scan initiated successfully. Results will be available shortly.",
  "status": "scanning"
}
```

**Status Codes:**
- `202 Accepted`: Scan initiated successfully (asynchronous operation)
- `500 Internal Server Error`: Failed to initiate disk scan

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/storage/force-scan
```

**Example Response:**
```json
{
  "message": "Disk scan initiated successfully. Results will be available shortly.",
  "status": "scanning"
}
```

**Notes:**
- This operation runs asynchronously
- Existing cache is cleared before scanning
- Results will be available via the `/stats` endpoint once scanning completes

---

### 4. Get Scan Status

Retrieves the current status of disk scanning operations.

**Endpoint:** `GET /api/storage/scan-status`

**Description:** Returns information about the last scan and current scanning status.

**Response Format:**
```json
{
  "lastScanTime": "2024-01-15T10:30:00.000Z",
  "isScanning": false
}
```

**Response Fields:**
- `lastScanTime` (string|null): Timestamp of the last completed scan
- `isScanning` (boolean): Whether a scan is currently in progress

**Status Codes:**
- `200 OK`: Successfully retrieved scan status
- `500 Internal Server Error`: Failed to fetch scan status

**Example Request:**
```bash
curl -X GET http://localhost:3000/api/storage/scan-status
```

**Example Response:**
```json
{
  "lastScanTime": "2024-01-15T10:30:00.000Z",
  "isScanning": false
}
```

---

## File Type Classifications

### Raw Media Files
Files that are not directly compatible with HLS streaming:
- **Video**: `.mp4`, `.mkv`, `.avi`, `.mov`, `.wmv`, `.flv`, `.webm`, `.m4v`, `.3gp`, `.ogv`, `.ts`, `.m2ts`, `.mts`
- **Audio**: `.m4a`, `.mp3`, `.flac`, `.wav`, `.aac`, `.ogg`, `.wma`

### HLS Media Files
Files and folders related to HLS streaming:
- **File Extensions**: `.m3u8`, `.ts`
- **Folder Names**: Folders containing "hls", "segments", or "playlist" in their names

## Automatic Scanning

The system automatically performs disk usage scans every 24 hours using a cron job:

**Default Schedule:** `0 0 * * *` (Every day at midnight)

**Environment Variable:** `DISK_SCAN_INTERVAL`

**Example Configuration:**
```bash
# Scan every 12 hours
DISK_SCAN_INTERVAL="0 */12 * * *"

# Scan every day at 2 AM
DISK_SCAN_INTERVAL="0 2 * * *"
```

## Redis Caching

The Storage API uses Redis for caching to improve performance:

### Cache Keys:
- `storage:stats` - Storage statistics (TTL: 1 hour)
- `storage:total_disk_space` - Total disk space setting (persistent)
- `storage:last_scan_time` - Last scan timestamp (persistent)

### Cache Behavior:
- Statistics are cached for 1 hour after calculation
- Cache is cleared when disk space is updated
- Cache is cleared before force scans
- Fresh calculations are performed if cache is empty

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error description",
  "details": "Detailed error message"
}
```

Common error scenarios:
- Invalid disk space format (400)
- Missing media folders (200 with empty stats)
- File system access errors (500)
- Redis connection errors (500)

## Performance Considerations

- **Large Media Libraries**: Scanning can take time for large media collections
- **Caching**: Results are cached to avoid repeated expensive calculations
- **Asynchronous Scanning**: Force scans run asynchronously to avoid blocking
- **Error Resilience**: Individual file errors don't stop the entire scan

## Integration Examples

### Frontend Integration
```javascript
// Get storage statistics
const getStorageStats = async () => {
  const response = await fetch('/api/storage/stats');
  const stats = await response.json();
  return stats;
};

// Update disk space
const updateDiskSpace = async (diskSpace) => {
  const response = await fetch('/api/storage/update-disk-space', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ totalDiskSpace: diskSpace })
  });
  return response.json();
};

// Force scan
const forceScan = async () => {
  const response = await fetch('/api/storage/force-scan', {
    method: 'POST'
  });
  return response.json();
};
```

### Monitoring Script
```bash
#!/bin/bash
# Simple monitoring script

# Get current stats
curl -s http://localhost:3000/api/storage/stats | jq '.'

# Check if scan is needed (older than 24 hours)
LAST_SCAN=$(curl -s http://localhost:3000/api/storage/scan-status | jq -r '.lastScanTime')
if [ "$LAST_SCAN" = "null" ]; then
  echo "No previous scan found, initiating force scan..."
  curl -X POST http://localhost:3000/api/storage/force-scan
fi
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DISK_SCAN_INTERVAL` | `"0 0 * * *"` | Cron schedule for automatic disk scanning |
| `REDIS_URL` | `"redis://localhost:6379"` | Redis connection URL |
| `TZ` | `"UTC"` | Timezone for cron jobs |

## Notes

- All file sizes are calculated in bytes and formatted for human readability
- The system follows symbolic links but avoids infinite loops
- Disk scanning respects file system permissions
- Statistics include only files in configured media folders
- HLS folder detection is case-insensitive

import { createSmartCacheRouter } from '../middleware/cache-invalidation-middleware';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../../app';
import { scannerService } from '../../services/scanner/scanner.service';

type AsyncRouteHandler<P = Record<string, string>, ResBody = unknown, ReqBody = unknown> = (
  req: Request<P, ResBody, ReqBody>,
  res: Response<ResBody>,
  next: NextFunction
) => Promise<void>;

interface MediaFolder {
  id: string;
  type: string;
  path: string;
  active: boolean;
}

interface FolderBody {
  path: string;
  type: 'movies' | 'series';
}

interface UpdateFolderParams {
  id: string;
}

interface UpdateFolderBody {
  active: boolean;
}

interface ResolveConflictParams {
  id: string;
}

interface ResolveConflictBody {
  selectedId: number;
}

// Start a manual scan
// Create a router with caching for GET routes and automatic cache invalidation for POST/PUT/DELETE routes
const router = createSmartCacheRouter(
  // Cache options for GET routes
  { ttl: 1800 }, // 30 minutes cache
  // Invalidation options for data-modifying routes (simplified: clear all cache)
  {}
);

const scanHandler: AsyncRouteHandler = async (_req, res) => {
  try {
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    const folders = await prisma.mediaFolder.findMany({
      select: { id: true, path: true, type: true, active: true },
      where: { active: true },
    });

    const config = {
      moviePaths: folders
        .filter((f: MediaFolder) => f.type === 'movies')
        .map((f: MediaFolder) => f.path),
      seriesPaths: folders
        .filter((f: MediaFolder) => f.type === 'series')
        .map((f: MediaFolder) => f.path),
      fileExtensions: ['.mp4', '.mkv', '.avi'],
    };

    // Send initial message
    res.write(`data: ${JSON.stringify({ status: 'Starting scan', progress: 0 })}\n\n`);

    // Define progress callback
    const progressCallback = (status: string, progress: number, details?: unknown): void => {
      const data = JSON.stringify({ status, progress, details });
      res.write(`data: ${data}\n\n`);
    };

    // Start scanning with progress reporting
    const results = await scannerService.scanAll(config, progressCallback);

    // Send final message with results
    res.write(
      `data: ${JSON.stringify({
        status: 'Scan completed',
        progress: 100,
        details: results,
        complete: true,
      })}\n\n`
    );

    // End the response
    res.end();
  } catch (error) {
    console.error('Error during scan:', error);
    // Try to send error to client if connection is still open
    try {
      res.write(
        `data: ${JSON.stringify({
          status: 'Error',
          error: 'Failed to complete scan',
          complete: true,
        })}\n\n`
      );
      res.end();
    } catch (e) {
      console.error('Failed to send error to client:', e);
    }
  }
};

// Add a new media folder
const addFolderHandler: AsyncRouteHandler<Record<string, never>, unknown, FolderBody> = async (
  req,
  res
) => {
  try {
    const { path, type } = req.body;

    if (!path || !type || !['movies', 'series'].includes(type)) {
      res.status(400).json({ error: 'Invalid folder configuration' });
      return;
    }

    const folder = await prisma.mediaFolder.create({
      data: { path, type },
    });

    res.json(folder);
  } catch (error) {
    console.error('Error adding folder:', error);
    res.status(500).json({ error: 'Failed to add folder' });
  }
};

// Get all media folders
const getFoldersHandler: AsyncRouteHandler = async (_req, res) => {
  try {
    const folders = await prisma.mediaFolder.findMany();
    res.json(folders);
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
};

// Update media folder status
const updateFolderHandler: AsyncRouteHandler<
  UpdateFolderParams,
  unknown,
  UpdateFolderBody
> = async (req, res) => {
  try {
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const folder = await prisma.mediaFolder.update({
      where: { id: req.params.id },
      data: { active },
    });

    res.json(folder);
  } catch (error) {
    console.error('Error updating folder:', error);
    res.status(500).json({ error: 'Failed to update folder' });
  }
};

// Delete media folder
const deleteFolderHandler: AsyncRouteHandler<{ id: string }> = async (req, res) => {
  try {
    await prisma.mediaFolder.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Folder deleted successfully' });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
};

// Get scanning conflicts
const getConflictsHandler: AsyncRouteHandler = async (_req, res) => {
  try {
    const conflicts = await prisma.scanningConflict.findMany({
      where: { resolved: false },
    });
    res.json(conflicts);
  } catch (error) {
    console.error('Error fetching conflicts:', error);
    res.status(500).json({ error: 'Failed to fetch conflicts' });
  }
};

// Resolve scanning conflict
const resolveConflictHandler: AsyncRouteHandler<
  ResolveConflictParams,
  unknown,
  ResolveConflictBody
> = async (req, res) => {
  try {
    const { selectedId } = req.body;

    if (!selectedId) {
      res.status(400).json({ error: 'Selected ID is required' });
      return;
    }

    // Use the scanner service to resolve the conflict
    const conflict = await scannerService.resolveConflict(req.params.id, selectedId);
    res.json(conflict);
  } catch (error) {
    console.error('Error resolving conflict:', error);
    if (error instanceof Error && error.message === 'Conflict not found') {
      res.status(404).json({ error: 'Conflict not found' });
    } else {
      res.status(500).json({ error: 'Failed to resolve conflict' });
    }
  }
};

// Delete scanning conflict
const deleteConflictHandler: AsyncRouteHandler<{ id: string }> = async (req, res) => {
  try {
    const result = await scannerService.deleteConflict(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error deleting conflict:', error);
    if (error instanceof Error && error.message === 'Conflict not found') {
      res.status(404).json({ error: 'Conflict not found' });
    } else {
      res.status(500).json({ error: 'Failed to delete conflict' });
    }
  }
};

// Delete all scanning conflicts
const deleteAllConflictsHandler: AsyncRouteHandler = async (_req, res) => {
  try {
    const result = await scannerService.deleteAllConflicts();
    res.json(result);
  } catch (error) {
    console.error('Error deleting all conflicts:', error);
    res.status(500).json({ error: 'Failed to delete all conflicts' });
  }
};

router.get('/scan', scanHandler);
router.post('/folders', addFolderHandler);
router.get('/folders', getFoldersHandler);
router.patch('/folders/:id', updateFolderHandler);
router.delete('/folders/:id', deleteFolderHandler);
router.get('/conflicts', getConflictsHandler);
router.post('/conflicts/:id/resolve', resolveConflictHandler);
router.delete('/conflicts/:id', deleteConflictHandler);
router.delete('/conflicts', deleteAllConflictsHandler);

export default router;

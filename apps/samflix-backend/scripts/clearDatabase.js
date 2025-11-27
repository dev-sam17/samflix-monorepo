// Script to empty all models from the database
import 'dotenv/config';
import { prisma } from '@samflix/prisma-client';

const logger = console.log;

async function clearDatabase() {
  try {
    logger('Starting database cleanup...');

    // Delete records with relationships first to avoid foreign key constraints
    // Episodes have a relationship with TvSeries
    logger('Deleting all Episodes...');
    await prisma.episode.deleteMany({});
    logger('✅ Episodes deleted');

    // Now we can delete the rest of the models
    logger('Deleting all TvSeries...');
    await prisma.tvSeries.deleteMany({});
    logger('✅ TvSeries deleted');

    logger('Deleting all Movies...');
    await prisma.movie.deleteMany({});
    logger('✅ Movies deleted');

    logger('Deleting all MediaFolders...');
    await prisma.mediaFolder.deleteMany({});
    logger('✅ MediaFolders deleted');

    logger('Deleting all ScanningConflicts...');
    await prisma.scanningConflict.deleteMany({});
    logger('✅ ScanningConflicts deleted');

    logger('Database cleanup completed successfully!');
  } catch (error) {
    logger('Error during database cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the function
clearDatabase()
  .then(() => console.log('Script execution completed.'))
  .catch((e) => {
    console.error('Script execution failed:', e);
    process.exit(1);
  });

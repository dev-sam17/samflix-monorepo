import path from 'path';
import { ParsedMovie, ParsedEpisode } from '../../types/media.types';

class ParserService {
  private readonly movieRegexPatterns = [
    // Pattern 1: Title (Year) [Attr1] [Attr2] ... [AttrN]
    /^(.+?)\s*\((\d{4})\)\s*(?:\[(.*?)\]\s*)*(.*)$/i,

    // Pattern 2: Title Year Attr1 Attr2 ... AttrN (space or dot separated)
    /^(.+?)[\s.]+(\d{4})[\s.]+(.*)$/i,

    // Pattern 3: Title [Attr1] [Attr2] ... [AttrN]
    /^(.+?)\s*(?:\[(.*?)\]\s*)+(.*)$/i,

    // Pattern 4: Title (Attr1 Attr2 ... AttrN)
    /^(.+?)\s*\((.*?)\)\s*(.*)$/i,

    // Pattern 5: Title only (fallback)
    /^(.+?)$/,
  ];

  private readonly episodeRegexPatterns = [
    // Pattern 1: Series S01 E02 (with space between S and E) - MUST BE FIRST
    /^(.+?)[\s.\-_]+[Ss](\d{1,2})[\s.\-_]+[Ee](\d{1,2})[\s.\-_]*(.*)$/i,

    // Pattern 2: Series - S01E02 - Title or Series.S01E02.Title (no space)
    /^(.+?)[\s.\-_]+[Ss](\d{1,2})[Ee](\d{1,2})[\s.\-_]+(.*)$/i,
    /^(.+?)[\s.\-_]+[Ss](\d{1,2})[Ee](\d{1,2})[\s.\-_]*$/i,

    // Pattern 3: Series - 01x02 - Title or Series.01x02.Title
    /^(.+?)[\s.\-_]+(\d{1,2})[xX](\d{1,2})[\s.\-_]+(.*)$/i,
    /^(.+?)[\s.\-_]+(\d{1,2})[xX](\d{1,2})[\s.\-_]*$/i,

    // Pattern 4: [SubsPlease] Chainsaw Man - 01v2 (1080p) [HASH]
    /^(.+?)[\s.\-_]+(\d{2,3})[vV]\d*[\s.\-_]+(.*)$/i,

    // Pattern 5: Series - 01 - Title (seasonless)
    /^(.+?)[\s.\-_]+(\d{2,3})[\s.\-_]+(.*)$/i,

    // Pattern 6: Fallback for just SxxEyy or xxXyy without title
    /^(.+?)[\s.\-_]+[Ss](\d{1,2})[Ee](\d{1,2})$/i,
    /^(.+?)[\s.\-_]+(\d{1,2})[xX](\d{1,2})$/i,
  ];

  parseMovie(filePath: string): ParsedMovie | null {
    const fileName = path.basename(filePath, path.extname(filePath));

    for (const pattern of this.movieRegexPatterns) {
      const match = fileName.match(pattern);
      if (match) {
        const [, title, year, resolution = '', quality = '', rip = '', sound = '', provider = ''] =
          match;

        return {
          fileName,
          filePath,
          title: this.cleanTitle(title!),
          year: parseInt(year!),
          resolution: resolution || undefined,
          quality: quality || undefined,
          rip: rip || undefined,
          sound: sound || undefined,
          provider: provider || undefined,
        };
      }
    }
    return null;
  }

  parseEpisode(filePath: string): ParsedEpisode | null {
    const fileName = path.basename(filePath, path.extname(filePath));

    for (const pattern of this.episodeRegexPatterns) {
      const match = fileName.match(pattern);
      if (match) {
        const [, seriesName, seasonStr, episodeStr] = match;

        // Extract quality info if present
        const qualityMatch = fileName.match(/\[(.*?)\]/g);
        const [resolution = '', quality = '', rip = '', sound = '', provider = ''] =
          qualityMatch || [];

        return {
          fileName,
          filePath,
          seriesName: this.cleanTitle(seriesName!),
          seasonNumber: parseInt(seasonStr!),
          episodeNumber: parseInt(episodeStr!),
          resolution: resolution?.replace(/[[\]]/g, '') || undefined,
          quality: quality?.replace(/[[\]]/g, '') || undefined,
          rip: rip?.replace(/[[\]]/g, '') || undefined,
          sound: sound?.replace(/[[\]]/g, '') || undefined,
          provider: provider?.replace(/[[\]]/g, '') || undefined,
        };
      }
    }
    return null;
  }

  private cleanTitle(title: string): string {
    return title.replace(/\./g, ' ').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  }
}

export const parserService = new ParserService();

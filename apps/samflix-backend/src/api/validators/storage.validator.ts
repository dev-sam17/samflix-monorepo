import { Request, Response, NextFunction } from "express";
import { z } from "zod";

// Schema for updating disk space
const updateDiskSpaceSchema = z.object({
  totalDiskSpace: z
    .string()
    .min(1, "Total disk space is required")
    .regex(
      /^\d+(\.\d+)?\s*(B|KB|MB|GB|TB|PB)$/i,
      "Invalid disk space format. Use format like '4TB', '500GB', '1.5TB', etc."
    )
});

/**
 * Validator for updating disk space
 */
export const validateUpdateDiskSpace = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    updateDiskSpaceSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Validation failed",
        details: error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
      return;
    }
    
    res.status(400).json({
      error: "Invalid request body"
    });
  }
};

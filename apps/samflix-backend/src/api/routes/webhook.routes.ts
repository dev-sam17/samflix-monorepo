import express from "express";
import { WebhookController } from "../controllers/webhook.controller";
import { createSmartCacheRouter } from '../middleware/cache-invalidation-middleware';

// Create a router with caching for GET routes and automatic cache invalidation for POST/PUT/DELETE routes
// For webhooks, we don't need caching since they are only POST endpoints
const router = createSmartCacheRouter(
  // No cache options needed for webhooks
  { ttl: 0 },
  // Invalidation options for data-modifying routes (simplified: clear all cache)
  {}
);
const webhookController = new WebhookController();

// Clerk webhook endpoint
// Using express.raw middleware with application/json type for Clerk webhook verification
router.post(
  "/clerk",
  express.raw({ type: "application/json" }),
  webhookController.handleClerkWebhook
);

export default router;

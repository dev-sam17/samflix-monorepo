import { Request, Response } from "express";
import { verifyWebhook } from "@clerk/express/webhooks";
import { WebhookService } from "../../services/webhook.service";

export class WebhookController {
  private webhookService: WebhookService;

  constructor() {
    this.webhookService = new WebhookService();
  }

  public handleClerkWebhook = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      // verifyWebhook takes the entire request object and handles verification
      const evt = await verifyWebhook(req);

      // Extract event type and data
      const { id } = evt.data;
      const eventType = evt.type;

      console.log(
        `Received webhook with ID ${id} and event type of ${eventType}`
      );
      console.log("Webhook payload:", evt.data);

      // Process the webhook event using our service
      await this.webhookService.processWebhookEvent(eventType, evt.data);

      res.send("Webhook received");
    } catch (err) {
      console.error("Error verifying webhook:", err);
      res.status(400).send("Error verifying webhook");
    }
  };
}

import { PrismaClient } from "@dev-sam17/prisma-client-for-samflix";

export class WebhookService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Process webhook events from Clerk
   * @param type Event type
   * @param data Event data
   */
  public async processWebhookEvent(type: string, data: any): Promise<void> {
    const clerkId = data.id;
    const email = data.email_addresses?.[0]?.email_address;
    const name =
      [data.first_name, data.last_name].filter(Boolean).join(" ") || null;
    const imageUrl = data.image_url || null;

    switch (type) {
      case "user.created":
        await this.createUser(clerkId, email, name, imageUrl);
        break;
      case "user.updated":
        await this.updateUser(clerkId, email, name, imageUrl);
        break;
      default:
        console.log(`Unhandled event type: ${type}`);
    }
  }

  /**
   * Create a new user in the database along with UserStats
   */
  private async createUser(
    clerkId: string,
    email: string,
    name: string | null,
    imageUrl: string | null
  ): Promise<void> {
    // Create user with nested userStats creation
    await this.prisma.user.create({
      data: {
        clerkId,
        email,
        name,
        imageUrl,
        // Create UserStats for this user in the same transaction
        userStats: {
          create: {
            // Default values will be applied automatically:
            // totalPlayTime: 0 (as defined in the schema)
          },
        },
      },
    });

    console.log(
      `Created user with Clerk ID ${clerkId} and initialized UserStats`
    );
  }

  /**
   * Update an existing user in the database
   */
  private async updateUser(
    clerkId: string,
    email: string,
    name: string | null,
    imageUrl: string | null
  ): Promise<void> {
    await this.prisma.user.update({
      where: { clerkId },
      data: {
        email,
        name,
        imageUrl,
      },
    });
  }
}

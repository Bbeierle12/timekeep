import { pool } from '../db/connection';

export type PushPlatform = 'EXPO' | 'WEB' | 'FCM' | 'APNS';

export type PushSubscription = {
  id: string;
  user_type: string;
  user_id: string;
  platform: PushPlatform;
  token: string;
  device_info: Record<string, unknown> | null;
  is_active: boolean;
};

export type PushNotification = {
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

export const pushNotificationService = {
  /**
   * Register a push notification subscription
   */
  async subscribe(params: {
    userType: 'EMPLOYEE' | 'ADMIN';
    userId: string;
    platform: PushPlatform;
    token: string;
    deviceInfo?: Record<string, unknown>;
  }): Promise<PushSubscription> {
    // Upsert subscription (update if token already exists)
    const result = await pool.query(
      `INSERT INTO push_subscriptions
       (user_type, user_id, platform, token, device_info, is_active, updated_at)
       VALUES ($1, $2, $3, $4, $5, TRUE, CURRENT_TIMESTAMP)
       ON CONFLICT (user_type, user_id, platform, token)
       DO UPDATE SET
         device_info = EXCLUDED.device_info,
         is_active = TRUE,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        params.userType,
        params.userId,
        params.platform,
        params.token,
        params.deviceInfo ? JSON.stringify(params.deviceInfo) : null
      ]
    );

    return result.rows[0] as PushSubscription;
  },

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(token: string): Promise<void> {
    await pool.query(
      `UPDATE push_subscriptions SET is_active = FALSE WHERE token = $1`,
      [token]
    );
  },

  /**
   * Get all active subscriptions for a user
   */
  async getSubscriptionsForUser(
    userType: 'EMPLOYEE' | 'ADMIN',
    userId: string
  ): Promise<PushSubscription[]> {
    const result = await pool.query(
      `SELECT * FROM push_subscriptions
       WHERE user_type = $1 AND user_id = $2 AND is_active = TRUE`,
      [userType, userId]
    );

    return result.rows as PushSubscription[];
  },

  /**
   * Send push notification to a specific user
   */
  async sendToUser(
    userType: 'EMPLOYEE' | 'ADMIN',
    userId: string,
    notification: PushNotification
  ): Promise<{ sent: number; failed: number }> {
    const subscriptions = await this.getSubscriptionsForUser(userType, userId);

    let sent = 0;
    let failed = 0;

    for (const subscription of subscriptions) {
      try {
        await this.sendToPlatform(subscription.platform, subscription.token, notification);
        sent++;
      } catch (error) {
        console.error(`Failed to send push to ${subscription.platform}:`, error);
        failed++;

        // Disable invalid subscriptions
        if (this.isInvalidTokenError(error)) {
          await pool.query(
            `UPDATE push_subscriptions SET is_active = FALSE WHERE id = $1`,
            [subscription.id]
          );
        }
      }
    }

    return { sent, failed };
  },

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(
    recipients: Array<{ userType: 'EMPLOYEE' | 'ADMIN'; userId: string }>,
    notification: PushNotification
  ): Promise<{ sent: number; failed: number }> {
    let totalSent = 0;
    let totalFailed = 0;

    for (const recipient of recipients) {
      const result = await this.sendToUser(recipient.userType, recipient.userId, notification);
      totalSent += result.sent;
      totalFailed += result.failed;
    }

    return { sent: totalSent, failed: totalFailed };
  },

  /**
   * Send to a specific platform
   * NOTE: Actual implementation requires platform-specific SDKs
   */
  async sendToPlatform(
    platform: PushPlatform,
    token: string,
    notification: PushNotification
  ): Promise<void> {
    switch (platform) {
      case 'EXPO':
        await this.sendExpo(token, notification);
        break;
      case 'WEB':
        await this.sendWebPush(token, notification);
        break;
      case 'FCM':
        await this.sendFcm(token, notification);
        break;
      case 'APNS':
        await this.sendApns(token, notification);
        break;
      default:
        throw new Error(`Unknown platform: ${platform}`);
    }
  },

  /**
   * Send via Expo Push API
   * TODO: Implement with expo-server-sdk
   */
  async sendExpo(token: string, notification: PushNotification): Promise<void> {
    // In production, use expo-server-sdk:
    // const expo = new Expo();
    // await expo.sendPushNotificationsAsync([{
    //   to: token,
    //   title: notification.title,
    //   body: notification.body,
    //   data: notification.data
    // }]);
    console.log('Expo push (stub):', { token, notification });
  },

  /**
   * Send via Web Push API
   * TODO: Implement with web-push package
   */
  async sendWebPush(token: string, notification: PushNotification): Promise<void> {
    // In production, use web-push:
    // await webpush.sendNotification(subscription, JSON.stringify(notification));
    console.log('Web push (stub):', { token, notification });
  },

  /**
   * Send via Firebase Cloud Messaging
   * TODO: Implement with firebase-admin
   */
  async sendFcm(token: string, notification: PushNotification): Promise<void> {
    // In production, use firebase-admin:
    // await admin.messaging().send({
    //   token,
    //   notification: { title: notification.title, body: notification.body },
    //   data: notification.data
    // });
    console.log('FCM push (stub):', { token, notification });
  },

  /**
   * Send via Apple Push Notification Service
   * TODO: Implement with @parse/node-apn
   */
  async sendApns(token: string, notification: PushNotification): Promise<void> {
    console.log('APNS push (stub):', { token, notification });
  },

  /**
   * Check if error indicates an invalid token
   */
  isInvalidTokenError(error: unknown): boolean {
    const message = (error as Error)?.message ?? '';
    return (
      message.includes('InvalidToken') ||
      message.includes('NotRegistered') ||
      message.includes('DeviceTokenNotForTopic')
    );
  },

  /**
   * Clean up inactive subscriptions older than 30 days
   */
  async cleanupInactiveSubscriptions(): Promise<number> {
    const result = await pool.query(
      `DELETE FROM push_subscriptions
       WHERE is_active = FALSE AND updated_at < NOW() - INTERVAL '30 days'
       RETURNING id`
    );

    return result.rowCount ?? 0;
  }
};

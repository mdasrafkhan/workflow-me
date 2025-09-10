export class CreateSubscriptionDto {
  userId: string;
  product: string;
  subscriptionTypeId?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  paymentReference?: string;
  metadata?: Record<string, any>;
}

export class SubscriptionResponseDto {
  id: string;
  userId: string;
  product: string;
  status: string;
  amount: number;
  currency: string;
  expiresAt: Date;
  createdAt: Date;
  subscriptionType: {
    id: string;
    name: string;
    displayName: string;
    billingCycle: string;
    features: string[];
  };
}

export class CancelSubscriptionDto {
  reason?: string;
}

export class SubscriptionStatisticsDto {
  total: number;
  active: number;
  cancelled: number;
  expired: number;
  byProduct: Record<string, number>;
  byStatus: Record<string, number>;
  revenue: {
    total: number;
    byProduct: Record<string, number>;
    byCurrency: Record<string, number>;
  };
}

export class SubscriptionTypeDto {
  id: string;
  name: string;
  displayName: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly' | 'lifetime';
  isActive: boolean;
  features: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Restaurant {
  id: string;
  name: string;
  ownerName: string;
  address: string;
  mobile: string;
  email: string;
  passwordHash: string;
  securityQuestion: string;
  securityAnswerHash: string;
  ownerUid?: string;
  createdAt: string; // ISO date
  trialEndsAt: string; // ISO date
  isLifetime: boolean;
  paymentStatus: 'none' | 'pending' | 'approved' | 'rejected';
}

export interface Category {
  id: string;
  name: string;
  restaurantId: string;
  createdAt: string;
  order?: number;
}

export interface FoodItem {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  categoryName?: string;
  restaurantId: string;
  createdAt: string;
}

export interface BillItem {
  foodId: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

export type PaymentMethod = 'ক্যাশ' | 'বিকাশ' | 'নগদ' | 'রকেট' | 'ব্যাংক' | 'কার্ড';

export interface Bill {
  id: string;
  invoiceNumber: string; // YYYYMMDD-001
  dateStr: string; // YYYY-MM-DD
  customerName: string;
  paymentMethod: PaymentMethod;
  items: BillItem[];
  grandTotal: number;
  status: 'PAID';
  restaurantId: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BillDraft {
  customerName: string;
  paymentMethod: PaymentMethod;
  items: BillItem[];
  updatedAt: string;
}

export interface PaymentRequest {
  id: string;
  restaurantId: string;
  restaurantName: string;
  ownerName: string;
  mobile: string;
  method: 'bKash' | 'Nagad';
  number: string;
  amount: number;
  transactionId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface AdminNotification {
  id: string;
  type: 'NEW_REGISTRATION' | 'NEW_PAYMENT';
  title: string;
  message: string;
  restaurantId: string;
  isRead: boolean;
  createdAt: string;
}

export interface StarterMenuItem {
  category: string;
  foods: { name: string; price: number }[];
}

export interface SystemSettings {
  lifetimeFee: number;
  bkashNumber: string;
  nagadNumber: string;
  trialDays: number;
  starterMenu?: StarterMenuItem[];
  // Website Branding & Contact Configuration (Admin Panel Editable)
  siteName?: string;
  siteTagline?: string;
  siteBadge?: string;
  logoUrl?: string;
  contactAddress?: string;
  supportPhone?: string;
  supportEmail?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  footerDescription?: string;
  copyrightText?: string;
  adminPasswordHash?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  tag: 'অফার' | 'নোটিশ' | 'আপডেট' | 'রমজান স্পেশাল' | 'সাধারণ';
  isActive: boolean;
  createdAt: string;
}

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  runTransaction,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import type {
  Restaurant,
  Category,
  FoodItem,
  Bill,
  BillDraft,
  PaymentRequest,
  AdminNotification,
  SystemSettings,
  StarterMenuItem,
  Announcement,
} from '../types';
import { getBangladeshDateCompact, getBangladeshDateString } from '../utils/date';
import { DEFAULT_SITE_SETTINGS, mergeSystemSettings } from '../utils/siteSettings';

export const DEFAULT_STARTER_MENU: StarterMenuItem[] = [
  {
    category: 'ইফতার ও নাস্তা',
    foods: [
      { name: 'স্পেশাল ইফতারি বক্স', price: 100 },
      { name: 'ছোলা বুট ও মুড়ি', price: 30 },
      { name: 'পিঁয়াজু ও বেগুনি (৪ পিস)', price: 20 },
      { name: 'চিকেন শর্মা', price: 110 },
      { name: 'সিঙ্গারা (২ পিস)', price: 20 },
    ],
  },
  {
    category: 'মিষ্টি ও দই',
    foods: [
      { name: 'মিষ্টি দই', price: 20 },
      { name: 'বগুড়ার স্পেশাল দই', price: 90 },
      { name: 'রসগোল্লা (২ পিস)', price: 40 },
      { name: 'কালোজাম (২ পিস)', price: 40 },
      { name: 'ফিরনি স্পেশাল', price: 50 },
    ],
  },
  {
    category: 'ভাত ও বিরিয়ানি',
    foods: [
      { name: 'চিকেন বিরিয়ানি', price: 180 },
      { name: 'মাটন কাচ্চি বিরিয়ানি', price: 260 },
      { name: 'বিফ তেহারি', price: 160 },
      { name: 'প্লেইন রাইস / ভাত', price: 30 },
      { name: 'খিচুড়ি স্পেশাল', price: 120 },
    ],
  },
  {
    category: 'মাছ ও মাংস',
    foods: [
      { name: 'চিকেন রোস্ট', price: 120 },
      { name: 'বিফ ভুনা', price: 170 },
      { name: 'মাটন কষা', price: 220 },
      { name: 'ইলিশ ভাজা', price: 200 },
      { name: 'রুই মাছের ঝোল', price: 130 },
    ],
  },
  {
    category: 'চা ও পানীয়',
    foods: [
      { name: 'দুধ চা', price: 15 },
      { name: 'রং চা / লেবু চা', price: 10 },
      { name: 'কোল্ড কফি', price: 70 },
      { name: 'স্পেশাল লাচ্ছি', price: 60 },
      { name: 'মিনারেল ওয়াটার (৫০০ মি.লি.)', price: 20 },
    ],
  },
];

const DEFAULT_SETTINGS: SystemSettings = {
  ...DEFAULT_SITE_SETTINGS,
  starterMenu: DEFAULT_STARTER_MENU,
};

// --- SYSTEM SETTINGS ---
export async function getSystemSettings(): Promise<SystemSettings> {
  const settingsDocRef = doc(db, 'settings', 'system');
  try {
    const snap = await getDoc(settingsDocRef);
    if (!snap.exists()) {
      await setDoc(settingsDocRef, DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    return mergeSystemSettings(snap.data() as Partial<SystemSettings>);
  } catch (err) {
    console.warn('Could not read settings from db, using defaults:', err);
    return DEFAULT_SETTINGS;
  }
}

export async function updateSystemSettings(settings: Partial<SystemSettings>): Promise<void> {
  const settingsDocRef = doc(db, 'settings', 'system');
  try {
    await setDoc(settingsDocRef, settings, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'settings/system');
  }
}

// --- RESTAURANTS ---
export async function getRestaurantById(id: string): Promise<Restaurant | null> {
  const rRef = doc(db, 'restaurants', id);
  try {
    const snap = await getDoc(rRef);
    if (!snap.exists()) return null;
    return snap.data() as Restaurant;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, `restaurants/${id}`);
  }
}

export async function getRestaurantByEmail(email: string): Promise<Restaurant | null> {
  const normEmail = email.trim().toLowerCase();
  try {
    const q = query(collection(db, 'restaurants'), where('email', '==', normEmail));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as Restaurant;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'restaurants');
  }
}

export async function registerRestaurant(data: {
  name: string;
  ownerName: string;
  address: string;
  mobile: string;
  email: string;
  passwordHash: string;
  securityQuestion: string;
  securityAnswerHash: string;
  ownerUid?: string;
}): Promise<Restaurant> {
  const existing = await getRestaurantByEmail(data.email);
  if (existing) {
    throw new Error('এই ইমেইল দিয়ে ইতোমধ্যে একটি রেস্তোরাঁ রেজিস্টার্ড রয়েছে।');
  }

  const settings = await getSystemSettings();
  const trialDays = settings.trialDays || 30;

  const now = new Date();
  const trialEnd = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

  // Generate safe ID
  const restaurantId = 'rest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  const newRestaurant: Restaurant = {
    id: restaurantId,
    name: data.name.trim(),
    ownerName: data.ownerName.trim(),
    address: data.address.trim(),
    mobile: data.mobile.trim(),
    email: data.email.trim().toLowerCase(),
    passwordHash: data.passwordHash,
    securityQuestion: data.securityQuestion.trim(),
    securityAnswerHash: data.securityAnswerHash,
    ownerUid: data.ownerUid || '',
    createdAt: now.toISOString(),
    passwordUpdatedAt: now.toISOString(),
    trialEndsAt: trialEnd.toISOString(),
    isLifetime: false,
    paymentStatus: 'none',
  };

  try {
    await setDoc(doc(db, 'restaurants', restaurantId), newRestaurant);

    // Create Admin notification
    const notifId = 'notif_' + Date.now();
    await setDoc(doc(db, 'adminNotifications', notifId), {
      id: notifId,
      type: 'NEW_REGISTRATION',
      title: 'নতুন রেস্তোরাঁ রেজিস্ট্রেশন',
      message: `${newRestaurant.name} (${newRestaurant.ownerName}) সফলভাবে অ্যাকাউন্ট খুলেছেন।`,
      restaurantId: restaurantId,
      isRead: false,
      createdAt: now.toISOString(),
    });

    return newRestaurant;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `restaurants/${restaurantId}`);
  }
}

export async function updateRestaurant(id: string, updates: Partial<Restaurant>): Promise<void> {
  try {
    await updateDoc(doc(db, 'restaurants', id), updates);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `restaurants/${id}`);
  }
}

export async function deleteRestaurantPermanently(id: string): Promise<void> {
  try {
    // 1. Delete categories
    const catSnap = await getDocs(collection(db, 'restaurants', id, 'categories'));
    for (const c of catSnap.docs) {
      await deleteDoc(c.ref);
    }
    // 2. Delete foods
    const foodSnap = await getDocs(collection(db, 'restaurants', id, 'foods'));
    for (const f of foodSnap.docs) {
      await deleteDoc(f.ref);
    }
    // 3. Delete bills
    const billSnap = await getDocs(collection(db, 'restaurants', id, 'bills'));
    for (const b of billSnap.docs) {
      await deleteDoc(b.ref);
    }
    // 4. Delete drafts
    const draftSnap = await getDocs(collection(db, 'restaurants', id, 'drafts'));
    for (const d of draftSnap.docs) {
      await deleteDoc(d.ref);
    }
    // 5. Delete invoice counters
    const counterSnap = await getDocs(collection(db, 'restaurants', id, 'invoiceCounters'));
    for (const ic of counterSnap.docs) {
      await deleteDoc(ic.ref);
    }
    // 6. Delete related payment requests
    const payQuery = query(collection(db, 'paymentRequests'), where('restaurantId', '==', id));
    const paySnap = await getDocs(payQuery);
    for (const p of paySnap.docs) {
      await deleteDoc(p.ref);
    }
    // 7. Delete related admin notifications
    const notifQuery = query(collection(db, 'adminNotifications'), where('restaurantId', '==', id));
    const notifSnap = await getDocs(notifQuery);
    for (const n of notifSnap.docs) {
      await deleteDoc(n.ref);
    }
    // 8. Delete restaurant document itself
    await deleteDoc(doc(db, 'restaurants', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `restaurants/${id}`);
  }
}

// --- CATEGORIES ---
export async function getCategories(restaurantId: string): Promise<Category[]> {
  try {
    const q = query(
      collection(db, 'restaurants', restaurantId, 'categories'),
      orderBy('createdAt', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Category);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `restaurants/${restaurantId}/categories`);
  }
}

export async function createCategory(restaurantId: string, name: string): Promise<Category> {
  const catId = 'cat_' + Date.now();
  const newCat: Category = {
    id: catId,
    name: name.trim(),
    restaurantId,
    createdAt: new Date().toISOString(),
  };
  try {
    await setDoc(doc(db, 'restaurants', restaurantId, 'categories', catId), newCat);
    return newCat;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `restaurants/${restaurantId}/categories/${catId}`);
  }
}

export async function updateCategory(restaurantId: string, categoryId: string, name: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'restaurants', restaurantId, 'categories', categoryId), {
      name: name.trim(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `restaurants/${restaurantId}/categories/${categoryId}`);
  }
}

export async function deleteCategory(restaurantId: string, categoryId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'restaurants', restaurantId, 'categories', categoryId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `restaurants/${restaurantId}/categories/${categoryId}`);
  }
}

// --- FOOD ITEMS ---
export async function getFoods(restaurantId: string): Promise<FoodItem[]> {
  try {
    const q = query(
      collection(db, 'restaurants', restaurantId, 'foods'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as FoodItem);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `restaurants/${restaurantId}/foods`);
  }
}

export async function createFood(
  restaurantId: string,
  food: { name: string; price: number; categoryId?: string; categoryName?: string }
): Promise<FoodItem> {
  const foodId = 'food_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const newFood: FoodItem = {
    id: foodId,
    name: food.name.trim(),
    price: Number(food.price),
    categoryId: food.categoryId || 'general',
    categoryName: food.categoryName?.trim() || 'সাধারণ',
    restaurantId,
    createdAt: new Date().toISOString(),
  };
  try {
    await setDoc(doc(db, 'restaurants', restaurantId, 'foods', foodId), newFood);
    return newFood;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `restaurants/${restaurantId}/foods/${foodId}`);
  }
}

export async function clearAllFoods(restaurantId: string): Promise<void> {
  try {
    const foods = await getFoods(restaurantId);
    for (const f of foods) {
      await deleteDoc(doc(db, 'restaurants', restaurantId, 'foods', f.id));
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `restaurants/${restaurantId}/foods`);
  }
}

export async function updateFood(
  restaurantId: string,
  foodId: string,
  updates: Partial<Pick<FoodItem, 'name' | 'price' | 'categoryId' | 'categoryName'>>
): Promise<void> {
  try {
    await updateDoc(doc(db, 'restaurants', restaurantId, 'foods', foodId), updates);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `restaurants/${restaurantId}/foods/${foodId}`);
  }
}

export async function deleteFood(restaurantId: string, foodId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'restaurants', restaurantId, 'foods', foodId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `restaurants/${restaurantId}/foods/${foodId}`);
  }
}

export async function importStarterMenu(restaurantId: string): Promise<{ categoriesCount: number; foodsCount: number }> {
  const settings = await getSystemSettings();
  const menuList = settings.starterMenu || DEFAULT_STARTER_MENU;

  let categoriesCount = 0;
  let foodsCount = 0;

  for (const block of menuList) {
    const cat = await createCategory(restaurantId, block.category);
    categoriesCount++;

    for (const f of block.foods) {
      await createFood(restaurantId, {
        name: f.name,
        price: f.price,
        categoryId: cat.id,
        categoryName: cat.name,
      });
      foodsCount++;
    }
  }

  return { categoriesCount, foodsCount };
}

// --- DRAFTS ---
export async function saveBillDraft(restaurantId: string, draft: BillDraft): Promise<void> {
  try {
    await setDoc(doc(db, 'restaurants', restaurantId, 'drafts', 'current'), draft);
  } catch (err) {
    // Draft save is non-blocking
    console.warn('Draft auto-save warning:', err);
  }
}

export async function getBillDraft(restaurantId: string): Promise<BillDraft | null> {
  try {
    const snap = await getDoc(doc(db, 'restaurants', restaurantId, 'drafts', 'current'));
    if (!snap.exists()) return null;
    return snap.data() as BillDraft;
  } catch (err) {
    return null;
  }
}

export async function clearBillDraft(restaurantId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'restaurants', restaurantId, 'drafts', 'current'));
  } catch (err) {
    console.warn('Clear draft warning:', err);
  }
}

// --- BILLING & INVOICING ---
export async function getBills(restaurantId: string): Promise<Bill[]> {
  try {
    const q = query(
      collection(db, 'restaurants', restaurantId, 'bills'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Bill);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, `restaurants/${restaurantId}/bills`);
  }
}

export async function getBillsByDate(restaurantId: string, dateStr: string): Promise<Bill[]> {
  try {
    const all = await getBills(restaurantId);
    return (all || []).filter(b => b.dateStr === dateStr);
  } catch (err) {
    console.warn('Could not fetch bills by date:', err);
    return [];
  }
}

/**
 * Atomic sequential invoice number generator:
 * Format: YYYYMMDD-001, YYYYMMDD-002, etc. Restarting every date per restaurant.
 */
export async function createBillAtomic(
  restaurantId: string,
  billInput: Omit<Bill, 'id' | 'invoiceNumber' | 'dateStr' | 'createdAt' | 'status'>
): Promise<Bill> {
  const dateCompact = getBangladeshDateCompact(); // YYYYMMDD
  const dateStr = getBangladeshDateString(); // YYYY-MM-DD
  const billId = 'bill_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  // Reference for atomic date counter
  const counterRef = doc(db, 'restaurants', restaurantId, 'invoiceCounters', dateCompact);
  const billRef = doc(db, 'restaurants', restaurantId, 'bills', billId);

  try {
    const finalInvoiceNumber = await runTransaction(db, async transaction => {
      const counterSnap = await transaction.get(counterRef);
      let nextSeq = 1;

      if (counterSnap.exists()) {
        const currentCount = counterSnap.data().count || 0;
        nextSeq = currentCount + 1;
      }

      const seqPadded = String(nextSeq).padStart(3, '0');
      const invoiceNumber = `${dateCompact}-${seqPadded}`;

      // Update counter
      transaction.set(counterRef, { count: nextSeq, date: dateCompact }, { merge: true });

      // Create bill
      const newBill: Bill = {
        id: billId,
        invoiceNumber,
        dateStr,
        customerName: billInput.customerName.trim(),
        paymentMethod: billInput.paymentMethod,
        items: billInput.items,
        grandTotal: billInput.grandTotal,
        status: 'PAID',
        restaurantId,
        createdAt: now,
      };

      transaction.set(billRef, newBill);
      return invoiceNumber;
    });

    // Clear saved draft on success
    clearBillDraft(restaurantId);

    return {
      id: billId,
      invoiceNumber: finalInvoiceNumber,
      dateStr,
      customerName: billInput.customerName.trim(),
      paymentMethod: billInput.paymentMethod,
      items: billInput.items,
      grandTotal: billInput.grandTotal,
      status: 'PAID',
      restaurantId,
      createdAt: now,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `restaurants/${restaurantId}/bills/${billId}`);
  }
}

export async function updateBill(
  restaurantId: string,
  billId: string,
  updates: Partial<Pick<Bill, 'customerName' | 'paymentMethod' | 'items' | 'grandTotal'>>
): Promise<void> {
  try {
    await updateDoc(doc(db, 'restaurants', restaurantId, 'bills', billId), {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `restaurants/${restaurantId}/bills/${billId}`);
  }
}

export async function deleteBillPermanently(restaurantId: string, billId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'restaurants', restaurantId, 'bills', billId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `restaurants/${restaurantId}/bills/${billId}`);
  }
}

// --- PAYMENT REQUESTS (LIFETIME ACCESS) ---
export async function submitPaymentRequest(params: {
  restaurantId: string;
  restaurantName: string;
  ownerName: string;
  mobile: string;
  method: 'bKash' | 'Nagad';
  number: string;
  amount: number;
  transactionId: string;
}): Promise<PaymentRequest> {
  const normTxId = params.transactionId.trim().toUpperCase();

  // Check global uniqueness across all payment applications
  const txQuery = query(collection(db, 'paymentRequests'), where('transactionId', '==', normTxId));
  const snap = await getDocs(txQuery);
  if (!snap.empty) {
    throw new Error('এই ট্রানজেকশন আইডি (Transaction ID) ইতোমধ্যে ব্যবহৃত হয়েছে! অনুগ্রহ করে সঠিক ট্রানজেকশন আইডি প্রদান করুন।');
  }

  const reqId = 'pay_' + Date.now();
  const now = new Date().toISOString();

  const newRequest: PaymentRequest = {
    id: reqId,
    restaurantId: params.restaurantId,
    restaurantName: params.restaurantName,
    ownerName: params.ownerName,
    mobile: params.mobile,
    method: params.method,
    number: params.number,
    amount: params.amount,
    transactionId: normTxId,
    status: 'PENDING',
    createdAt: now,
  };

  try {
    await setDoc(doc(db, 'paymentRequests', reqId), newRequest);

    // Update restaurant payment status
    await updateDoc(doc(db, 'restaurants', params.restaurantId), {
      paymentStatus: 'pending',
    });

    // Notify Super Admin
    const notifId = 'notif_' + Date.now();
    await setDoc(doc(db, 'adminNotifications', notifId), {
      id: notifId,
      type: 'NEW_PAYMENT',
      title: 'নতুন পেমেন্ট আবেদন',
      message: `${params.restaurantName} থেকে ${params.method} মাধ্যমে ৳${params.amount} এর ট্রানজেকশন (${normTxId}) জমা পড়েছে।`,
      restaurantId: params.restaurantId,
      isRead: false,
      createdAt: now,
    });

    return newRequest;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `paymentRequests/${reqId}`);
  }
}

export async function getPaymentRequestsForRestaurant(restaurantId: string): Promise<PaymentRequest[]> {
  try {
    const q = query(
      collection(db, 'paymentRequests'),
      where('restaurantId', '==', restaurantId)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map(d => d.data() as PaymentRequest);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'paymentRequests');
  }
}

export async function getAllPaymentRequests(): Promise<PaymentRequest[]> {
  try {
    const q = query(collection(db, 'paymentRequests'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as PaymentRequest);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'paymentRequests');
  }
}

export async function approvePaymentRequest(requestId: string, restaurantId: string): Promise<void> {
  const now = new Date().toISOString();
  try {
    // 1. Mark request as APPROVED
    await setDoc(
      doc(db, 'paymentRequests', requestId),
      {
        status: 'APPROVED',
        reviewedAt: now,
      },
      { merge: true }
    );

    // 2. Activate lifetime access on restaurant document
    await setDoc(
      doc(db, 'restaurants', restaurantId),
      {
        isLifetime: true,
        paymentStatus: 'approved',
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `paymentRequests/${requestId}`);
  }
}

export async function rejectPaymentRequest(
  requestId: string,
  restaurantId: string,
  reason: string
): Promise<void> {
  const now = new Date().toISOString();
  try {
    await setDoc(
      doc(db, 'paymentRequests', requestId),
      {
        status: 'REJECTED',
        rejectionReason: reason.trim(),
        reviewedAt: now,
      },
      { merge: true }
    );

    await setDoc(
      doc(db, 'restaurants', restaurantId),
      {
        paymentStatus: 'rejected',
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `paymentRequests/${requestId}`);
  }
}

// --- ADMIN BROADCAST ANNOUNCEMENTS / ADS ---
export async function getAnnouncements(): Promise<Announcement[]> {
  try {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Announcement);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'announcements');
  }
}

export async function getActiveAnnouncements(): Promise<Announcement[]> {
  try {
    const all = await getAnnouncements();
    return all.filter(a => a.isActive);
  } catch (err) {
    console.warn('Failed to load active announcements:', err);
    return [];
  }
}

export async function createAnnouncement(params: {
  title: string;
  content: string;
  tag: Announcement['tag'];
  isActive: boolean;
}): Promise<Announcement> {
  const id = 'ad_' + Date.now();
  const newAd: Announcement = {
    id,
    title: params.title.trim(),
    content: params.content.trim(),
    tag: params.tag || 'অফার',
    isActive: params.isActive !== false,
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(doc(db, 'announcements', id), newAd);
    return newAd;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `announcements/${id}`);
  }
}

export async function updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<void> {
  try {
    await setDoc(doc(db, 'announcements', id), updates, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `announcements/${id}`);
  }
}

export async function deleteAnnouncement(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'announcements', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `announcements/${id}`);
  }
}

// --- ADMIN NOTIFICATIONS ---
export async function getAdminNotifications(): Promise<AdminNotification[]> {
  try {
    const q = query(collection(db, 'adminNotifications'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as AdminNotification);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'adminNotifications');
  }
}

export async function markAdminNotificationRead(id: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'adminNotifications', id), { isRead: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `adminNotifications/${id}`);
  }
}

export async function deleteAdminNotification(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'adminNotifications', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `adminNotifications/${id}`);
  }
}

export async function deleteAllAdminNotifications(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'adminNotifications'));
    for (const n of snap.docs) {
      await deleteDoc(n.ref);
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, 'adminNotifications');
  }
}

// --- SUPER ADMIN RESTAURANT DIRECTORY ---
// Tenant isolation: Only basic registration info returned, zero private bills or sales!
export async function getAllRestaurantsForAdmin(): Promise<Restaurant[]> {
  try {
    const q = query(collection(db, 'restaurants'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Restaurant);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'restaurants');
  }
}

import React, { useEffect, useState, useRef } from 'react';
import type { Restaurant, Category, FoodItem, BillItem, PaymentMethod, Bill } from '../../types';
import {
  getCategories,
  getFoods,
  getBillDraft,
  saveBillDraft,
  clearBillDraft,
  createBillAtomic,
  importStarterMenu,
} from '../../services/db';
import { calculateTrialStatus, formatBengaliNumber, formatTaka } from '../../utils/date';
import {
  UtensilsCrossed,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Eye,
  AlertCircle,
  FilePlus,
  Search,
  Lock,
  ArrowRight,
  Mic,
  Square,
  Loader2,
  Volume2,
  X,
} from 'lucide-react';
import { ReceiptModal } from '../common/ReceiptModal';
import { TopAccentBar } from '../common/TopAccentBar';
import {
  parseVoiceTranscriptToItems,
  extractCustomerNameFromTranscript,
  mergeDictatedItems,
} from '../../utils/voiceOrderParser';

interface BrowserSpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [altIndex: number]: { transcript: string };
    };
  };
}

interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface NewBillProps {
  restaurant: Restaurant;
  onNavigate: (view: string) => void;
}

const ALL_PAYMENT_METHODS: PaymentMethod[] = [
  'ক্যাশ',
  'বিকাশ',
  'নগদ',
  'রকেট',
  'ব্যাংক',
  'কার্ড',
];

export const NewBill: React.FC<NewBillProps> = ({ restaurant, onNavigate }) => {
  const trialInfo = calculateTrialStatus(restaurant.trialEndsAt, restaurant.isLifetime);
  const isLocked = trialInfo.isExpired && !restaurant.isLifetime;

  const [categories, setCategories] = useState<Category[]>([]);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Bill State
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ক্যাশ');
  const [items, setItems] = useState<BillItem[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [confirmedBill, setConfirmedBill] = useState<Bill | null>(null);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // Voice Dictation State
  const [voiceState, setVoiceState] = useState<'idle' | 'listening' | 'processing'>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [voiceFeedback, setVoiceFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    transcript?: string;
    summary: string;
  } | null>(null);

  // Auto-save debounce timer & voice media refs
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const transcriptRef = useRef<string>('');
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Stop media tracks cleanly
  const cleanupVoiceResources = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // Ignore stop errors if already stopped
      }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore recorder stop errors
      }
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  // Load menu & restore draft
  useEffect(() => {
    isMountedRef.current = true;
    let isMounted = true;
    async function init() {
      setIsLoading(true);
      try {
        const [cats, foodList, draft] = await Promise.all([
          getCategories(restaurant.id),
          getFoods(restaurant.id),
          getBillDraft(restaurant.id),
        ]);

        if (!isMounted) return;

        setCategories(cats);
        setFoods(foodList);

        // Restore draft if available
        if (draft && draft.items && draft.items.length > 0) {
          setCustomerName(draft.customerName || '');
          setPaymentMethod(draft.paymentMethod || 'ক্যাশ');
          setItems(draft.items || []);
        }
      } catch (err) {
        console.error('Failed to load menu or draft:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    init();

    return () => {
      isMounted = false;
      isMountedRef.current = false;
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      cleanupVoiceResources();
    };
  }, [restaurant.id]);

  // Auto-save draft on change
  useEffect(() => {
    if (isLoading || isLocked) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      if (items.length > 0 || customerName.trim().length > 0) {
        saveBillDraft(restaurant.id, {
          customerName,
          paymentMethod,
          items,
          updatedAt: new Date().toISOString(),
        });
      }
    }, 800);
  }, [customerName, paymentMethod, items, restaurant.id, isLoading, isLocked]);

  // Food Selection Handler: Click adds 1 unit; repeat click increments
  const handleFoodClick = (food: FoodItem) => {
    if (isLocked) return;
    setErrorMsg(null);

    setItems(prevItems => {
      const existingIdx = prevItems.findIndex(i => i.foodId === food.id);
      if (existingIdx >= 0) {
        // Increment quantity
        const updated = [...prevItems];
        const current = updated[existingIdx];
        const nextQty = current.quantity + 1;
        updated[existingIdx] = {
          ...current,
          quantity: nextQty,
          total: nextQty * current.price,
        };
        return updated;
      } else {
        // Add new item
        const newItem: BillItem = {
          foodId: food.id,
          name: food.name,
          price: food.price,
          quantity: 1,
          total: food.price,
        };
        return [...prevItems, newItem];
      }
    });
  };

  // Quantity Controls
  const handleUpdateQuantity = (foodId: string, newQty: number) => {
    if (newQty < 1) return; // Quantity must never become 0 or negative
    setItems(prev =>
      prev.map(item =>
        item.foodId === foodId
          ? {
              ...item,
              quantity: newQty,
              total: newQty * item.price,
            }
          : item
      )
    );
  };

  const handleRemoveItem = (foodId: string) => {
    setItems(prev => prev.filter(i => i.foodId !== foodId));
  };

  const handleClearBill = () => {
    if (items.length === 0 && !customerName) return;
    setIsClearModalOpen(true);
  };

  const confirmClearBill = () => {
    setItems([]);
    setCustomerName('');
    clearBillDraft(restaurant.id);
    setIsClearModalOpen(false);
  };

  // Grand Total calculation
  const grandTotal = items.reduce((sum, item) => sum + item.total, 0);

  // Dynamically compute categories from both category list and food items
  const dynamicCategories: { id: string; name: string }[] = [];
  const addedNames = new Set<string>();

  categories.forEach(c => {
    dynamicCategories.push({ id: c.id, name: c.name });
    addedNames.add(c.name);
  });

  foods.forEach(f => {
    if (f.categoryName && f.categoryName !== 'সাধারণ' && !addedNames.has(f.categoryName)) {
      dynamicCategories.push({ id: f.categoryName, name: f.categoryName });
      addedNames.add(f.categoryName);
    }
  });

  // Filter foods by Category and Search
  const filteredFoods = foods.filter(food => {
    const matchesCategory =
      selectedCategory === 'ALL' ||
      food.categoryId === selectedCategory ||
      food.categoryName === selectedCategory;
    const matchesSearch =
      food.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      (food.categoryName && food.categoryName.toLowerCase().includes(searchQuery.trim().toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Validation before preview or confirmation
  const validateBill = (): boolean => {
    if (isLocked) {
      setErrorMsg('ট্রায়ালের মেয়াদ শেষ হয়েছে! অনুগ্রহ করে লাইফটাইম অ্যাক্সেসের ফি পরিশোধ করুন।');
      return false;
    }

    if (items.length === 0) {
      setErrorMsg('কমপক্ষে একটি খাবার আইটেম নির্বাচন করুন।');
      return false;
    }

    if (!customerName.trim()) {
      setErrorMsg('গ্রাহকের নাম (Customer Name) প্রদান করা আবশ্যক!');
      return false;
    }

    if (!paymentMethod) {
      setErrorMsg('পরিশোধ পদ্ধতি নির্বাচন করুন।');
      return false;
    }

    setErrorMsg(null);
    return true;
  };

  // Open Preview Modal
  const handleOpenPreview = () => {
    if (validateBill()) {
      setIsPreviewOpen(true);
    }
  };

  // Confirm and Save Final Bill
  const handleConfirmBill = async () => {
    if (!validateBill()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const created = await createBillAtomic(restaurant.id, {
        customerName: customerName.trim(),
        paymentMethod,
        items,
        grandTotal,
        restaurantId: restaurant.id,
      });

      // Clear local states
      setItems([]);
      setCustomerName('');
      setIsPreviewOpen(false);

      // Open Digital Receipt
      setConfirmedBill(created);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'বিল নিশ্চিত করতে সমস্যা হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportStarter = async () => {
    setIsLoading(true);
    try {
      await importStarterMenu(restaurant.id);
      const [cats, foodList] = await Promise.all([
        getCategories(restaurant.id),
        getFoods(restaurant.id),
      ]);
      setCategories(cats);
      setFoods(foodList);
    } catch (err) {
      setErrorMsg('মেনু ইমপোর্ট করতে সমস্যা হয়েছে।');
    } finally {
      setIsLoading(false);
    }
  };

  // Convert recorded Blob into base64 string (without data URL prefix)
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        const commaIdx = result.indexOf(',');
        resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
      };
      reader.onerror = () => reject(new Error('অডিও ফাইল পড়তে সমস্যা হয়েছে।'));
      reader.readAsDataURL(blob);
    });
  };

  // Apply recognized items + optional customer/table label to bill state
  const applyVoiceOrderResult = (
    matchedEntries: { food: FoodItem; quantity: number }[],
    heardTranscript: string,
    detectedCustomer?: string | null
  ) => {
    if (matchedEntries.length === 0) {
      setVoiceFeedback({
        type: 'warning',
        transcript: heardTranscript || undefined,
        summary: heardTranscript
          ? 'শোনা কথাগুলোর সাথে মেনুর কোনো খাবার মেলেনি। অনুগ্রহ করে খাবারের নাম স্পষ্টভাবে বলুন।'
          : 'কোনো ভয়েস বা অর্ডার শনাক্ত করা যায়নি। অনুগ্রহ করে মাইক্রোফোনের কাছে পরিষ্কারভাবে বলুন।',
      });
      return;
    }

    setItems(prev => mergeDictatedItems(prev, matchedEntries));

    if (detectedCustomer && !customerName.trim()) {
      setCustomerName(detectedCustomer);
    }

    const summaryText = matchedEntries
      .map(m => `${formatBengaliNumber(m.quantity)}× ${m.food.name}`)
      .join(', ');

    setErrorMsg(null);
    setVoiceFeedback({
      type: 'success',
      transcript: heardTranscript || undefined,
      summary: `বিলে যোগ হয়েছে: ${summaryText}`,
    });
  };

  // Process finished recording & transcript via Gemini server route with deterministic fallback
  const processRecordedVoiceOrder = async (audioBlob: Blob | null, mimeType: string, draftTranscript: string) => {
    if (!isMountedRef.current) return;
    setVoiceState('processing');

    try {
      let audioBase64 = '';
      if (audioBlob && audioBlob.size > 0) {
        audioBase64 = await blobToBase64(audioBlob);
      }

      if (!audioBase64 && !draftTranscript.trim()) {
        setVoiceFeedback({
          type: 'warning',
          summary: 'কোনো শব্দ রেকর্ড হয়নি। অনুগ্রহ করে আবার চেষ্টা করুন।',
        });
        return;
      }

      let serverMatched: { food: FoodItem; quantity: number }[] = [];
      let finalTranscript = draftTranscript.trim();
      let detectedCustomer: string | null = extractCustomerNameFromTranscript(finalTranscript);

      if (audioBase64 || finalTranscript) {
        try {
          const response = await fetch('/api/ai/parse-voice-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: audioBase64 || undefined,
              mimeType,
              transcript: finalTranscript || undefined,
              menuItems: foods.map(f => ({ id: f.id, name: f.name, price: f.price })),
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.transcript) {
              finalTranscript = String(data.transcript).trim();
            }
            if (data.customerName && String(data.customerName).trim()) {
              detectedCustomer = String(data.customerName).trim();
            } else if (finalTranscript) {
              detectedCustomer = extractCustomerNameFromTranscript(finalTranscript);
            }

            const foodMap = new Map(foods.map(f => [f.id, f]));
            if (Array.isArray(data.items)) {
              serverMatched = data.items
                .filter((it: { foodId: string; quantity: number }) => foodMap.has(it.foodId))
                .map((it: { foodId: string; quantity: number }) => ({
                  food: foodMap.get(it.foodId)!,
                  quantity: Math.max(1, Number(it.quantity) || 1),
                }));
            }
          }
        } catch (apiErr) {
          console.warn('Voice API unavailable, using local transcript parser fallback:', apiErr);
        }
      }

      if (!isMountedRef.current) return;

      if (serverMatched.length > 0) {
        applyVoiceOrderResult(serverMatched, finalTranscript, detectedCustomer);
      } else {
        // Deterministic fallback parser on transcript
        const localMatched = parseVoiceTranscriptToItems(finalTranscript, foods);
        applyVoiceOrderResult(
          localMatched.map(m => ({ food: m.food, quantity: m.quantity })),
          finalTranscript,
          detectedCustomer
        );
      }
    } catch (err) {
      console.error('Voice order processing failed:', err);
      if (isMountedRef.current) {
        setVoiceFeedback({
          type: 'error',
          summary: 'ভয়েস অর্ডার প্রসেস করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।',
        });
      }
    } finally {
      if (isMountedRef.current) {
        setVoiceState('idle');
        setRecordingSeconds(0);
      }
    }
  };

  // Start capturing microphone audio + live Web Speech transcript
  const startVoiceDictation = async () => {
    if (isLocked || voiceState !== 'idle') return;

    if (foods.length === 0) {
      setVoiceFeedback({
        type: 'warning',
        summary: 'ভয়েস অর্ডার ব্যবহার করতে আগে মেনুতে অন্তত একটি খাবার যোগ করুন।',
      });
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setVoiceFeedback({
        type: 'error',
        summary: 'এই ব্রাউজারে মাইক্রোফোন অ্যাক্সেস সাপোর্ট করে না।',
      });
      return;
    }

    setVoiceFeedback(null);
    setLiveTranscript('');
    transcriptRef.current = '';
    audioChunksRef.current = [];
    setRecordingSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!isMountedRef.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      mediaStreamRef.current = stream;

      // Setup optional browser SpeechRecognition in parallel for live captions & offline fallback
      const SpeechRecCtor =
        (window as unknown as { SpeechRecognition?: new () => BrowserSpeechRecognition; webkitSpeechRecognition?: new () => BrowserSpeechRecognition }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: new () => BrowserSpeechRecognition }).webkitSpeechRecognition;

      if (SpeechRecCtor) {
        try {
          const recognition = new SpeechRecCtor();
          recognition.lang = 'bn-BD';
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
            let combined = '';
            for (let i = 0; i < event.results.length; i++) {
              const seg = event.results[i]?.[0]?.transcript || '';
              combined += (combined ? ' ' : '') + seg;
            }
            const clean = combined.trim();
            transcriptRef.current = clean;
            if (isMountedRef.current) {
              setLiveTranscript(clean);
            }
          };
          recognition.onerror = () => {
            // Keep MediaRecorder running even if SpeechRecognition fails
          };
          recognition.start();
          recognitionRef.current = recognition;
        } catch {
          // Ignore if SpeechRecognition fails to start
        }
      }

      // Setup MediaRecorder if available
      if (typeof MediaRecorder !== 'undefined') {
        const preferredTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
        const chosenMime =
          typeof MediaRecorder.isTypeSupported === 'function'
            ? preferredTypes.find(t => MediaRecorder.isTypeSupported(t)) || ''
            : '';

        const recorder = chosenMime
          ? new MediaRecorder(stream, { mimeType: chosenMime })
          : new MediaRecorder(stream);

        recorder.ondataavailable = (ev: BlobEvent) => {
          if (ev.data && ev.data.size > 0) {
            audioChunksRef.current.push(ev.data);
          }
        };

        mediaRecorderRef.current = recorder;
        recorder.start(250);
      }

      setVoiceState('listening');
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      cleanupVoiceResources();
      const errName = err && typeof err === 'object' && 'name' in err ? String((err as { name: string }).name) : '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setVoiceFeedback({
          type: 'error',
          summary: 'মাইক্রোফোন ব্যবহারের অনুমতি দেওয়া হয়নি। অনুগ্রহ করে ব্রাউজার সেটিংস থেকে মাইক্রোফোন চালু করুন।',
        });
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setVoiceFeedback({
          type: 'error',
          summary: 'ডিভাইসে কোনো মাইক্রোফোন পাওয়া যায়নি। মাইক্রোফোন সংযুক্ত আছে কিনা যাচাই করুন।',
        });
      } else {
        setVoiceFeedback({
          type: 'error',
          summary: 'মাইক্রোফোন চালু করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
        });
      }
      setVoiceState('idle');
    }
  };

  // Stop listening and trigger order item extraction
  const stopVoiceDictation = () => {
    if (voiceState !== 'listening') return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    const stream = mediaStreamRef.current;

    if (recorder && recorder.state !== 'inactive') {
      const mimeType = recorder.mimeType || 'audio/webm';
      recorder.onstop = () => {
        if (stream) {
          stream.getTracks().forEach(t => t.stop());
        }
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;

        const audioBlob =
          audioChunksRef.current.length > 0
            ? new Blob(audioChunksRef.current, { type: mimeType })
            : null;
        processRecordedVoiceOrder(audioBlob, mimeType, transcriptRef.current);
      };
      try {
        recorder.stop();
      } catch {
        if (stream) stream.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        processRecordedVoiceOrder(null, mimeType, transcriptRef.current);
      }
    } else {
      if (stream) stream.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      processRecordedVoiceOrder(null, 'audio/webm', transcriptRef.current);
    }
  };

  const handleToggleVoiceDictation = () => {
    if (voiceState === 'listening') {
      stopVoiceDictation();
    } else if (voiceState === 'idle') {
      startVoiceDictation();
    }
  };

  // LOCKED STATE IF TRIAL EXPIRED
  if (isLocked) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
          আপনার ৩০ দিনের ফ্রি ট্রায়ালের মেয়াদ শেষ হয়েছে
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          রেস্তোরাঁহিসাবের নিয়মিত বিলিং ও ব্যবস্থাপনা চালিয়ে যেতে বিকাশ বা নগদে এককালীন লাইফটাইম ফি পরিশোধ করে আজীবন অ্যাক্সেস সক্রিয় করুন।
        </p>
        <button
          onClick={() => onNavigate('payment')}
          className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md transition-all inline-flex items-center gap-2"
        >
          <span>লাইফটাইম পেমেন্ট জমা দিন</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-orange-400" />
            ডাইরেক্ট ডাইন-ইন বিলিং
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            খাবারের বাটনে ক্লিক করুন, ক্রেতার নাম দিন এবং নিশ্চিত করুন
          </p>
        </div>

        {items.length > 0 && (
          <button
            onClick={handleClearBill}
            className="text-xs text-rose-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            বিলটি বাতিল / নতুন করুন
          </button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs sm:text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Billing Grid: 2 Columns (Food Catalog Left, Bill Summary Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Food Category & Buttons Grid (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search & Category Filter Bar */}
          <div className="relative overflow-hidden bg-[#0E1524] p-4 rounded-2xl border border-slate-800 shadow-lg space-y-3">
            <TopAccentBar variant="blue" />
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="খাবারের নাম বা ক্যাটাগরি খুঁজুন..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs sm:text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder:text-slate-400"
              />
            </div>

            {/* Category Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === 'ALL'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'bg-[#151E2E] text-slate-300 hover:bg-[#1E293B] hover:text-white border border-slate-700/70'
                }`}
              >
                সব খাবার ({foods.length})
              </button>
              {dynamicCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-[#151E2E] text-slate-300 hover:bg-[#1E293B] hover:text-white border border-slate-700/70'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Food Items Buttons Grid */}
          {isLoading ? (
            <div className="p-12 text-center text-sm text-slate-300 bg-[#0E1524] rounded-2xl border border-slate-800">খাবার লোড হচ্ছে...</div>
          ) : foods.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#0E1524] border border-slate-800 text-center space-y-3">
              <UtensilsCrossed className="w-10 h-10 mx-auto text-orange-400" />
              <h3 className="font-bold text-white text-base">
                কোনো খাবার আইটেম পাওয়া যায়নি
              </h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto">
                আপনি নিজে মেনু তৈরি করতে পারেন অথবা ১ ক্লিকে বাংলাদেশের সাধারণ খাবার মেনু যোগ করে নিতে পারেন।
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleImportStarter}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                >
                  সাধারণ মেনু যোগ করুন
                </button>
                <button
                  onClick={() => onNavigate('menu')}
                  className="px-4 py-2 rounded-xl border border-slate-700 bg-[#151E2E] text-white font-semibold text-xs hover:bg-[#1E293B] cursor-pointer"
                >
                  মেনু পেজে যান
                </button>
              </div>
            </div>
          ) : filteredFoods.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-300 bg-[#0E1524] rounded-2xl border border-slate-800">
              এই ক্যাটাগরিতে কোনো খাবার মেলেনি।
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredFoods.map(food => {
                const inBill = items.find(i => i.foodId === food.id);
                return (
                  <button
                    key={food.id}
                    type="button"
                    onClick={() => handleFoodClick(food)}
                    className={`relative p-3.5 rounded-2xl border text-left transition-all active:scale-95 group shadow-md flex flex-col justify-between min-h-[96px] cursor-pointer ${
                      inBill
                        ? 'border-orange-500 bg-[#231610] ring-2 ring-orange-500/30'
                        : 'border-slate-800 bg-[#0E1524] hover:border-orange-500 hover:bg-[#151E2E]'
                    }`}
                  >
                    {/* Badge if item is in bill */}
                    {inBill && (
                      <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-orange-600 text-white text-[11px] font-bold shadow-sm">
                        {formatBengaliNumber(inBill.quantity)}
                      </span>
                    )}

                    <div>
                      <h4 className="font-bold text-white text-sm line-clamp-2 leading-tight">
                        {food.name}
                      </h4>
                      {food.categoryName && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {food.categoryName}
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-base font-extrabold text-amber-300">
                        {formatTaka(food.price)}
                      </span>
                      <span className="text-[10px] text-slate-300 group-hover:text-orange-400 font-semibold">
                        + যোগ করুন
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT: Customer Info & Real-Time Bill Table (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative overflow-hidden bg-[#0E1524] rounded-2xl border border-slate-800 shadow-xl p-5 space-y-4">
            <TopAccentBar variant="amber" />
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 relative z-10">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <FilePlus className="w-5 h-5 text-orange-400" />
                বর্তমান বিল তালিকা
              </h3>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#151E2E] border border-slate-700 text-white">
                {formatBengaliNumber(items.length)} আইটেম
              </span>
            </div>

            {/* Voice Order Dictation Panel */}
            <div className="relative overflow-hidden p-3.5 rounded-xl bg-[#0B0F17] border border-slate-800 space-y-2.5">
              <TopAccentBar variant="cyan" />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      voiceState === 'listening'
                        ? 'bg-rose-950/70 border-rose-500/60 text-rose-400'
                        : voiceState === 'processing'
                        ? 'bg-amber-950/70 border-amber-500/50 text-amber-300'
                        : 'bg-[#151E2E] border-slate-700 text-orange-400'
                    }`}
                  >
                    {voiceState === 'processing' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      ভয়েস অর্ডার ডিক্টেশন (মাইক্রোফোন)
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {voiceState === 'listening'
                        ? `শোনা হচ্ছে (${formatBengaliNumber(recordingSeconds)} সে.) — খাবারের নাম ও পরিমাণ বলুন`
                        : voiceState === 'processing'
                        ? 'আপনার অর্ডার মিলিয়ে নেওয়া হচ্ছে...'
                        : 'যেমন: "দুইটা কাচ্চি বিরিয়ানি আর একটা বোরহানি"'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="voice-mic-button"
                  onClick={handleToggleVoiceDictation}
                  disabled={voiceState === 'processing' || isLoading}
                  aria-label={voiceState === 'listening' ? 'ভয়েস রেকর্ডিং থামান' : 'মাইক্রোফোন দিয়ে অর্ডার বলুন'}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 ${
                    voiceState === 'listening'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30'
                      : 'bg-orange-600 hover:bg-orange-700 text-white shadow-sm'
                  }`}
                >
                  {voiceState === 'listening' ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>থামান</span>
                    </>
                  ) : voiceState === 'processing' ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>প্রসেস হচ্ছে</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" />
                      <span>বলুন</span>
                    </>
                  )}
                </button>
              </div>

              {/* Live Caption Stream while Listening */}
              {voiceState === 'listening' && (
                <div
                  data-testid="voice-live-transcript"
                  className="px-3 py-2 rounded-lg bg-[#111927] border border-orange-500/40 text-xs text-slate-200 flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span className="truncate">
                    {liveTranscript ? `“${liveTranscript}”` : 'মাইক্রোফোন চালু আছে — এখন অর্ডার বলুন...'}
                  </span>
                </div>
              )}

              {/* Voice Recognition Result / Error Feedback */}
              {voiceFeedback && voiceState !== 'listening' && (
                <div
                  data-testid="voice-feedback-banner"
                  className={`px-3 py-2 rounded-lg border text-xs flex items-start justify-between gap-2 ${
                    voiceFeedback.type === 'success'
                      ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
                      : voiceFeedback.type === 'warning'
                      ? 'bg-amber-950/40 border-amber-700/60 text-amber-200'
                      : 'bg-rose-950/40 border-rose-700/60 text-rose-200'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0">
                    {voiceFeedback.transcript && (
                      <p data-testid="voice-transcript-text" className="text-[11px] text-slate-300 truncate">
                        শোনা হয়েছে: “{voiceFeedback.transcript}”
                      </p>
                    )}
                    <p className="font-semibold leading-snug">{voiceFeedback.summary}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVoiceFeedback(null)}
                    aria-label="ভয়েস বার্তা বন্ধ করুন"
                    className="text-slate-400 hover:text-white p-0.5 shrink-0 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Mandatory Customer Name */}
            <div>
              <label className="block text-xs font-bold text-white mb-1">
                গ্রাহকের নাম (Customer Name) *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="যেমন: জনাব রহমান / টেবিল ১ এর কাস্টমার"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none placeholder:text-slate-400"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                * বিল কনফার্ম করতে কাস্টমারের নাম দেওয়া বাধ্যতামূলক।
              </p>
            </div>

            {/* Mandatory Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-white mb-1.5">
                পরিশোধ পদ্ধতি (Payment Method) *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {ALL_PAYMENT_METHODS.map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      paymentMethod === method
                        ? 'border-orange-500 bg-orange-600 text-white shadow-sm'
                        : 'border-slate-700 bg-[#0B0F17] text-slate-200 hover:border-slate-500 hover:bg-[#151E2E]'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Items List with Quantity Controls */}
            <div className="border-t border-slate-800 pt-3">
              <span className="text-xs font-bold text-white block mb-2">
                নির্বাচিত খাবারসমূহ:
              </span>

              {items.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-300 bg-[#0B0F17] rounded-xl border border-dashed border-slate-700">
                  বামপাশের খাবার বাটনে ক্লিক করে বিলে আইটেম যোগ করুন
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {items.map(item => (
                    <div
                      key={item.foodId}
                      className="p-2.5 rounded-xl bg-[#111927] border border-slate-700/80 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <h5 className="font-bold text-white truncate">
                          {item.name}
                        </h5>
                        <span className="text-slate-300 text-[11px]">
                          {formatTaka(item.price)} × {formatBengaliNumber(item.quantity)}
                        </span>
                      </div>

                      {/* Quantity Controls: (-) input (+) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.foodId, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-7 h-7 rounded-lg border border-slate-600 bg-[#151E2E] flex items-center justify-center text-white hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={e => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 1) {
                              handleUpdateQuantity(item.foodId, val);
                            }
                          }}
                          className="w-12 text-center py-1 rounded-lg border border-slate-600 bg-[#0B0F17] text-white font-bold font-mono text-xs"
                        />

                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(item.foodId, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg border border-slate-600 bg-[#151E2E] flex items-center justify-center text-white hover:bg-slate-700 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Total & Remove */}
                      <div className="text-right shrink-0 min-w-[65px]">
                        <span className="font-bold text-white block">
                          {formatTaka(item.total)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.foodId)}
                          className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                        >
                          মুছুন
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Calculations: Item Total & Grand Total (NO VAT, NO DISCOUNT) */}
            <div className="pt-3 border-t-2 border-dashed border-slate-700 space-y-1.5">
              <div className="flex justify-between items-center text-slate-300 text-xs">
                <span>মোট খাবার মূল্য:</span>
                <span className="font-bold font-mono text-white">{formatTaka(grandTotal)}</span>
              </div>
              <div className="flex justify-between items-center text-white text-base font-extrabold pt-1">
                <span>সর্বমোট বিল (Grand Total):</span>
                <span className="text-xl text-amber-300">
                  {formatTaka(grandTotal)}
                </span>
              </div>
            </div>

            {/* Actions: Preview & Confirm */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handleOpenPreview}
                disabled={items.length === 0 || !customerName.trim()}
                className="flex-1 py-3 rounded-xl border border-slate-700 bg-[#151E2E] hover:bg-[#1E293B] text-white font-bold text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                প্রিভিউ দেখুন
              </button>
              <button
                type="button"
                onClick={handleConfirmBill}
                disabled={isSubmitting || items.length === 0 || !customerName.trim()}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-500/25 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>বিল হচ্ছে...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    বিল কনফার্ম করুন
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bill Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0E1524] text-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-800 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center pb-3 border-b border-slate-800">
              <h3 className="font-bold text-lg text-white">
                বিল নিশ্চিতকরণ প্রিভিউ
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                নিশ্চিত করার আগে ক্রেতার নাম ও আইটেমসমূহ মিলিয়ে নিন
              </p>
            </div>

            <div className="text-xs space-y-2 text-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-400">রেস্তোরাঁ:</span>
                <span className="font-bold text-white">
                  {restaurant.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">গ্রাহকের নাম:</span>
                <span className="font-bold text-white">
                  {customerName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">পরিশোধ পদ্ধতি:</span>
                <span className="font-bold text-orange-400">
                  {paymentMethod}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-300">
                    <th className="text-left pb-1 font-semibold">খাবার</th>
                    <th className="text-center pb-1 font-semibold">পরিমাণ</th>
                    <th className="text-right pb-1 font-semibold">মোট</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {items.map((it, idx) => (
                    <tr key={idx} className="py-1">
                      <td className="py-1.5 text-left font-medium text-white">{it.name}</td>
                      <td className="py-1.5 text-center font-mono text-slate-200">
                        {formatBengaliNumber(it.quantity)}
                      </td>
                      <td className="py-1.5 text-right font-bold text-white">
                        {formatTaka(it.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t-2 border-dashed border-slate-700 flex justify-between items-center text-sm font-bold text-white">
              <span>সর্বমোট প্রদেয় বিল:</span>
              <span className="text-lg text-amber-300 font-extrabold">
                {formatTaka(grandTotal)}
              </span>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="w-1/2 py-2.5 rounded-xl border border-slate-700 bg-[#151E2E] text-white font-semibold text-xs hover:bg-[#1E293B] cursor-pointer"
              >
                এডিট করুন
              </button>
              <button
                type="button"
                onClick={handleConfirmBill}
                disabled={isSubmitting}
                className="w-1/2 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                {isSubmitting ? 'প্রসেসিং...' : 'বিল নিশ্চিত করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Bill In-App Modal */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0E1524] text-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-800 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  বিলটি বাতিল করবেন?
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  বর্তমান খসড়া বিল এবং নির্বাচিত সকল খাবার তালিকা মুছে নতুন বিল শুরু হবে।
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsClearModalOpen(false)}
                className="w-1/2 py-2 rounded-xl border border-slate-700 bg-[#151E2E] text-white text-xs font-semibold hover:bg-[#1E293B] cursor-pointer"
              >
                না, রাখুন
              </button>
              <button
                type="button"
                onClick={confirmClearBill}
                className="w-1/2 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                হ্যাঁ, বাতিল করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmed Bill Digital Receipt Modal */}
      {confirmedBill && (
        <ReceiptModal
          bill={confirmedBill}
          restaurant={restaurant}
          onClose={() => setConfirmedBill(null)}
          onNewBill={() => {
            setConfirmedBill(null);
            setItems([]);
            setCustomerName('');
          }}
        />
      )}
    </div>
  );
};

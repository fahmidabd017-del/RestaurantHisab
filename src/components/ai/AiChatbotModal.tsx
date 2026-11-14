import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  X,
  Bot,
  User as UserIcon,
  RotateCcw,
  Copy,
  Check,
  Zap,
  TrendingUp,
  Utensils,
  Calculator,
  MessageSquare,
  AlertCircle,
  Minimize2,
  Maximize2,
  Database,
  RefreshCw,
  HelpCircle,
  Square,
  Moon,
  FileCheck2,
  Pin,
  PinOff,
  Trash2,
  Search,
  Plus,
  Edit2,
  Bookmark,
  Store,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import type { Restaurant, FoodItem, Bill } from '../../types';
import { getFoods, getBillsByDate } from '../../services/db';
import { getBangladeshDateString, formatBengaliNumber, formatTaka } from '../../utils/date';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  suggestions?: string[];
  isPinned?: boolean;
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
  messages: ChatMessage[];
}

interface AiChatbotModalProps {
  restaurant?: Restaurant | null;
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
}

// Preset topic categories with beautifully formulated questions
const TOPIC_PRESETS = [
  {
    id: 'ramadan',
    label: '🌙 রমজান ও ইফতার',
    icon: Moon,
    questions: [
      'রমজান মাসে রেস্তোরাঁর জন্য ১০০ টাকা ও ২০০ টাকার আকর্ষণীয় এবং লাভজনক ইফতারি বক্স প্যাকেজ মেনু সাজিয়ে দিন।',
      'সেহরি ও ইফতারিতে কাস্টমার বেশি পেতে আকর্ষণীয় সোশ্যাল মিডিয়া অফার পোস্ট লিখে দিন।',
      'ইফতারের আইটেমে অপচয় কমানো এবং কাঁচামাল ফ্রেশ রাখার ৩টি সেরা নিয়ম জানান।',
    ],
  },
  {
    id: 'sales',
    label: '📈 বিক্রি বৃদ্ধি',
    icon: TrendingUp,
    questions: [
      'আমাদের এলাকার অন্যান্য হোটেলের চেয়ে আমার রেস্তোরাঁয় দৈনিক বিক্রি ২০% বাড়ানোর ৫টি কার্যকর কৌশল দিন।',
      'কাস্টমারদের আবার ফিরিয়ে আনার জন্য সহজ কিন্তু কার্যকর কাস্টমার লয়ালটি আইডিয়া দিন।',
      'বিকেল ও সন্ধ্যার নাস্তার বিক্রি বাড়াতে আকর্ষণীয় চা ও স্ন্যাক্স অফার কীভাবে করব?',
    ],
  },
  {
    id: 'costing',
    label: '💰 ফুড কস্টিং ও লাভ',
    icon: Calculator,
    questions: [
      'খাবারের কাঁচামাল খরচ (Food Cost) এবং লাভ (Profit Margin) সঠিকভাবে হিসাব করার সহজ ফর্মুলা বুঝিয়ে দিন।',
      'বাজার দর বাড়লেও খাবারের মান ঠিক রেখে লাভজনক থাকার কৌশল কী?',
      'খাবারের প্রতিটি প্লেটে লাভ কত থাকা উচিত (আদর্শ পার্সেন্টেজ কত)?',
    ],
  },
  {
    id: 'audit',
    label: '🧾 অডিট ও রিপোর্ট',
    icon: FileCheck2,
    questions: [
      'দৈনিক A4 সাইজ বিক্রি অডিট রিপোর্ট সংরক্ষণ করা রেস্তোরাঁর হিসাবের জন্য কেন অপরিহার্য?',
      'ক্যাশ টাকার গরমিল এবং কাউন্টার চুরি ঠেকানোর কার্যকর উপায় কী?',
      'বিকাশ ও নগদ ডিজিটাল পেমেন্ট বাড়ালে রেস্তোরাঁর কী কী সুবিধা হয়?',
    ],
  },
];

const STORAGE_KEY_PREFIX = 'restauranthisab_ai_dark_sessions_';

export const AiChatbotModal: React.FC<AiChatbotModalProps> = ({
  restaurant,
  isOpen,
  onClose,
  initialPrompt,
}) => {
  const storageKey = STORAGE_KEY_PREFIX + (restaurant?.id || 'guest');

  // Multi-session chat history state
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load chat sessions:', e);
    }

    // Default initial session
    const initialSessionId = 'session_' + Date.now();
    return [
      {
        id: initialSessionId,
        title: 'রেস্তোরাঁ ব্যবসায়িক সূচনা',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPinned: true,
        messages: [
          {
            id: 'welcome_1',
            role: 'model',
            content: `আসসালামু আলাইকুম${restaurant ? ` **${restaurant.name}**` : ''}! 🍽️\n\nআমি **রেস্তোরাঁহিসাব এআই স্টুডিও** — আপনার রেস্তোরাঁর সার্বক্ষণিক ব্যবসায়িক ও মেনু পরামর্শদাতা।\n\nআপনার জন্য সুবিধাগুলো:\n• **প্রফেশনাল ব্ল্যাক স্ক্রিন**: সম্পূর্ণ কালো স্ক্রিন ও সাদা সুস্পষ্ট লেখায় চোখের জন্য আরামদায়ক\n• **চ্যাট সংরক্ষণ ও পিন**: যেকোনো আলোচনা সংরক্ষণ, পিন ও ডিলিট করার স্বাধীনতা\n• **লাইভ মেনু ও বিক্রি ডাটা**: আপনার দোকানের আসল খাবার ও আজকের বিক্রির উপর ভিত্তি করে সঠিক পরামর্শ\n• **গুরুত্বপূর্ণ পরামর্শ পিন**: জরুরি রেসিপি খরচ বা অফার পিন করে সংরক্ষণ করতে পারবেন\n\nনিচের যেকোনো প্রশ্নে ট্যাপ করুন অথবা আপনার নতুন প্রশ্ন টাইপ করুন!`,
            timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
            suggestions: [
              'রমজানে ১০০ টাকার লাভজনক ইফতারি বক্স প্যাকেজ মেনু সাজিয়ে দিন',
              '২০ টাকা মিষ্টি দই ও নাস্তা দিয়ে বিক্রি দ্বিগুণ করার কম্বো অফার দিন',
              'খাবারের কাঁচামাল খরচ ও লাভ হিসাব করার সহজ ফর্মুলা বুঝিয়ে দিন',
            ],
          },
        ],
      },
    ];
  });

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    return sessions[0]?.id || 'session_' + Date.now();
  });

  // UI state - default FullScreen & Pure Black Theme
  const [isFullScreen, setIsFullScreen] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'fast' | 'general'>('fast');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>('ramadan');
  const [showPinnedDrawer, setShowPinnedDrawer] = useState(false);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState('');

  // Live restaurant context from Firestore
  const [liveFoods, setLiveFoods] = useState<FoodItem[]>([]);
  const [liveTodayBills, setLiveTodayBills] = useState<Bill[]>([]);
  const [isLoadingContext, setIsLoadingContext] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Sync sessions with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(sessions));
    } catch (e) {
      console.warn('Could not save sessions to localStorage:', e);
    }
  }, [sessions, storageKey]);

  // Load real-time restaurant context
  useEffect(() => {
    if (!restaurant?.id || !isOpen) return;

    let isMounted = true;
    async function loadLiveContext() {
      setIsLoadingContext(true);
      try {
        const todayStr = getBangladeshDateString();
        const [foods, todayBills] = await Promise.all([
          getFoods(restaurant!.id),
          getBillsByDate(restaurant!.id, todayStr),
        ]);
        if (isMounted) {
          setLiveFoods(foods || []);
          setLiveTodayBills(todayBills || []);
        }
      } catch (e) {
        console.warn('Failed to load live restaurant context for AI:', e);
      } finally {
        if (isMounted) setIsLoadingContext(false);
      }
    }

    loadLiveContext();
    return () => {
      isMounted = false;
    };
  }, [restaurant?.id, isOpen]);

  // Current active session
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const messages = activeSession ? activeSession.messages : [];
  const pinnedMessages = messages.filter(m => m.isPinned);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, isOpen, isMinimized, activeSessionId]);

  useEffect(() => {
    if (initialPrompt && isOpen) {
      setIsMinimized(false);
      handleSendMessage(initialPrompt);
    }
  }, [initialPrompt, isOpen]);

  // Financial aggregates
  const todayTotalSales = liveTodayBills.reduce((s, b) => s + (b.grandTotal || 0), 0);
  const todayCashSales = liveTodayBills.filter(b => b.paymentMethod === 'ক্যাশ').reduce((s, b) => s + (b.grandTotal || 0), 0);
  const todayDigitalSales = todayTotalSales - todayCashSales;

  // Build live context payload
  const buildLiveContextData = () => {
    if (!restaurant) return {};

    const menuPreview = liveFoods.slice(0, 15).map(f => `${f.name} (৳${f.price}, ক্যাটাগরি: ${f.categoryName || 'সাধারণ'})`).join('; ');

    return {
      restaurantName: restaurant.name,
      ownerName: restaurant.ownerName,
      address: restaurant.address,
      menuSummary: menuPreview || 'ডিফল্ট রেস্তোরাঁ মেনু',
      todaySales: todayTotalSales,
      todayOrders: liveTodayBills.length,
      topSellingItems: liveFoods.slice(0, 5).map(f => f.name).join(', '),
      cashVsDigital: `ক্যাশ ৳${todayCashSales}, ডিজিটাল ৳${todayDigitalSales}`,
    };
  };

  // --- SESSION MANAGEMENT ---
  const handleCreateNewSession = () => {
    if (isLoading) handleStopGeneration();

    const newId = 'session_' + Date.now();
    const newSession: ChatSession = {
      id: newId,
      title: `নতুন কথোপকথন (${formatBengaliNumber(sessions.length + 1)})`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPinned: false,
      messages: [
        {
          id: 'welcome_' + Date.now(),
          role: 'model',
          content: `নতুন চ্যাটে আপনাকে স্বাগতম${restaurant ? ` **${restaurant.name}**` : ''}! 🍽️\n\nআপনার মেনুর দাম, রমজান ইফতার কম্বো, কাস্টমার বাড়ানো কিংবা ফুড কস্টিং সংক্রান্ত যেকোনো প্রশ্ন করুন।`,
          timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
          suggestions: [
            'আমাদের আজকের বিক্রির উপর ভিত্তি করে কালকের লাভ বাড়ানোর কৌশল দিন',
            '১০০ টাকা ইফতারি ও ২০ টাকা মিষ্টি দই দিয়ে অফার তৈরি করুন',
            'খাবারের কাঁচামাল খরচ (Food Cost) হিসাব করার নিয়ম কী?',
          ],
        },
      ],
    };

    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newId);
    setErrorMessage(null);
  };

  const handleTogglePinSession = (sessionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSessions(prev =>
      prev.map(s => (s.id === sessionId ? { ...s, isPinned: !s.isPinned } : s))
    );
  };

  const handleDeleteSession = (sessionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (sessions.length <= 1) {
      setSessions([
        {
          id: 'session_' + Date.now(),
          title: 'নতুন কথোপকথন',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isPinned: false,
          messages: [
            {
              id: 'init_msg',
              role: 'model',
              content: 'পূর্ববর্তী চ্যাট মুছে ফেলা হয়েছে। আপনার রেস্তোরাঁ সংক্রান্ত যেকোনো নতুন প্রশ্ন জিজ্ঞাসা করুন!',
              timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
            },
          ],
        },
      ]);
      return;
    }

    const remaining = sessions.filter(s => s.id !== sessionId);
    setSessions(remaining);
    if (activeSessionId === sessionId) {
      setActiveSessionId(remaining[0].id);
    }
  };

  const handleRenameSession = (sessionId: string, newTitle: string) => {
    const cleanTitle = newTitle.trim();
    if (!cleanTitle) return;
    setSessions(prev =>
      prev.map(s => (s.id === sessionId ? { ...s, title: cleanTitle } : s))
    );
    setEditingTitleId(null);
  };

  // --- MESSAGE ACTIONS (PIN & DELETE MESSAGE) ---
  const handleTogglePinMessage = (msgId: string) => {
    setSessions(prev =>
      prev.map(s => {
        if (s.id !== activeSessionId) return s;
        return {
          ...s,
          messages: s.messages.map(m =>
            m.id === msgId ? { ...m, isPinned: !m.isPinned } : m
          ),
        };
      })
    );
  };

  const handleDeleteMessage = (msgId: string) => {
    setSessions(prev =>
      prev.map(s => {
        if (s.id !== activeSessionId) return s;
        return {
          ...s,
          messages: s.messages.filter(m => m.id !== msgId),
        };
      })
    );
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  // Helper to extract suggestions
  const extractSuggestions = (text: string): { cleanText: string; suggestions: string[] } => {
    const suggestions: string[] = [];
    const cleanText = text.replace(/\[SUGGESTION:\s*([^\]]+)\]/g, (_, q) => {
      suggestions.push(q.trim());
      return '';
    }).trim();

    return {
      cleanText,
      suggestions: suggestions.slice(0, 3),
    };
  };

  // --- SEND MESSAGE WITH STREAMING & AUTO-FALLBACK ---
  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt || isLoading || !activeSession) return;

    setErrorMessage(null);

    const userMessage: ChatMessage = {
      id: 'usr_' + Date.now(),
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
    };

    const nextMessages = [...messages, userMessage];

    const isFirstUserMsg = !messages.some(m => m.role === 'user');
    const updatedTitle = isFirstUserMsg
      ? prompt.slice(0, 30) + (prompt.length > 30 ? '...' : '')
      : activeSession.title;

    setSessions(prev =>
      prev.map(s =>
        s.id === activeSessionId
          ? {
              ...s,
              title: updatedTitle,
              updatedAt: new Date().toISOString(),
              messages: nextMessages,
            }
          : s
      )
    );

    setInputPrompt('');
    setIsLoading(true);

    const botMessageId = 'bot_' + Date.now();
    const botPlaceholder: ChatMessage = {
      id: botMessageId,
      role: 'model',
      content: '',
      timestamp: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }),
      isStreaming: true,
    };

    setSessions(prev =>
      prev.map(s =>
        s.id === activeSessionId
          ? {
              ...s,
              messages: [...s.messages, botPlaceholder],
            }
          : s
      )
    );

    const contextData = buildLiveContextData();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
          mode,
          contextData,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Streaming failed, fallback to standard');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.text) {
                accumulatedText += parsed.text;
                const { cleanText } = extractSuggestions(accumulatedText);

                setSessions(prev =>
                  prev.map(s => {
                    if (s.id !== activeSessionId) return s;
                    return {
                      ...s,
                      messages: s.messages.map(m =>
                        m.id === botMessageId ? { ...m, content: cleanText } : m
                      ),
                    };
                  })
                );
              }
            } catch (jsonErr) {
              // ignore partial
            }
          }
        }
      }

      const { cleanText, suggestions } = extractSuggestions(accumulatedText);
      setSessions(prev =>
        prev.map(s => {
          if (s.id !== activeSessionId) return s;
          return {
            ...s,
            messages: s.messages.map(m =>
              m.id === botMessageId
                ? {
                    ...m,
                    content: cleanText || 'উত্তর সম্পন্ন হয়েছে।',
                    suggestions,
                    isStreaming: false,
                  }
                : m
            ),
          };
        })
      );
    } catch (streamError: any) {
      if (streamError.name === 'AbortError') return;

      console.warn('Streaming error, fallback to /api/ai/chat:', streamError);

      try {
        const fallbackRes = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
            mode,
            contextData,
          }),
        });

        const data = await fallbackRes.json();
        if (!fallbackRes.ok || data.error) throw new Error(data.error);

        setSessions(prev =>
          prev.map(s => {
            if (s.id !== activeSessionId) return s;
            return {
              ...s,
              messages: s.messages.map(m =>
                m.id === botMessageId
                  ? {
                      ...m,
                      content: data.text,
                      suggestions: data.suggestions || [],
                      isStreaming: false,
                    }
                  : m
              ),
            };
          })
        );
      } catch (finalErr: any) {
        setErrorMessage(finalErr.message || 'নেটওয়ার্কে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
        setSessions(prev =>
          prev.map(s => {
            if (s.id !== activeSessionId) return s;
            return {
              ...s,
              messages: s.messages.filter(m => m.id !== botMessageId),
            };
          })
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Safe markdown & table rendering: PURE BLACK BACKGROUND & PURE WHITE TEXT
  const renderFormattedText = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let tableBuffer: string[] = [];

    const flushTable = () => {
      if (tableBuffer.length >= 2) {
        const headerLine = tableBuffer[0];
        const rowLines = tableBuffer.slice(2);
        const headers = headerLine.split('|').map(c => c.trim()).filter(Boolean);
        const rows = rowLines.map(r => r.split('|').map(c => c.trim()).filter(Boolean));

        elements.push(
          <div key={`table_${elements.length}`} className="my-3 overflow-x-auto rounded-xl border border-slate-700 bg-[#050812] shadow-md">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead className="bg-[#020617] text-white font-black border-b border-slate-700">
                <tr>
                  {headers.map((h, hi) => (
                    <th key={hi} className="px-3 py-2.5 text-white border-r border-slate-800 last:border-r-0">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-bold text-white">
                {rows.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? 'bg-[#080d1a]' : 'bg-[#0c1222]'}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2.5 text-white border-r border-slate-800 last:border-r-0">
                        <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(cell) }} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      tableBuffer = [];
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        tableBuffer.push(trimmed);
        return;
      } else if (tableBuffer.length > 0) {
        flushTable();
      }

      if (!trimmed) {
        elements.push(<div key={`sp_${idx}`} className="h-1.5" />);
        return;
      }

      if (trimmed.startsWith('### ')) {
        elements.push(
          <h5 key={idx} className="font-black text-sm sm:text-base text-white pt-2.5 pb-0.5 tracking-tight">
            {trimmed.replace('### ', '')}
          </h5>
        );
        return;
      }
      if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
        elements.push(
          <h4 key={idx} className="font-black text-base sm:text-lg text-orange-400 pt-3 pb-1 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            {trimmed.replace(/^#+\s*/, '')}
          </h4>
        );
        return;
      }

      if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        const textAfterBullet = trimmed.slice(2);
        elements.push(
          <div key={idx} className="flex items-start gap-2 ml-1 my-1 text-white">
            <span className="text-orange-400 font-black leading-tight mt-0.5">•</span>
            <span className="text-white" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(textAfterBullet) }} />
          </div>
        );
        return;
      }

      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        elements.push(
          <div key={idx} className="flex items-start gap-2 ml-1 my-1 text-white">
            <span className="text-orange-400 font-black shrink-0">{formatBengaliNumber(numMatch[1])}.</span>
            <span className="text-white" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(numMatch[2]) }} />
          </div>
        );
        return;
      }

      elements.push(
        <p key={idx} className="my-1 text-white" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }} />
      );
    });

    if (tableBuffer.length > 0) flushTable();

    return <div className="space-y-0.5 text-xs sm:text-sm text-white leading-relaxed">{elements}</div>;
  };

  const formatInlineMarkdown = (text: string): string => {
    const safe = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    let formatted = safe.replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-white">$1</strong>');
    formatted = formatted.replace(/(৳\s*[\d,]+)/g, '<span class="font-mono font-black text-amber-400">$1</span>');
    return formatted;
  };

  // Filter sessions by search
  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.messages.some(m => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const pinnedSessions = filteredSessions.filter(s => s.isPinned);
  const regularSessions = filteredSessions.filter(s => !s.isPinned);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md transition-all ${
      isFullScreen ? 'p-0' : 'p-2 sm:p-4'
    }`}>
      {/* Minimized bottom floating pill */}
      {isMinimized ? (
        <div className="fixed bottom-4 right-4 bg-[#0a0f1d] border-2 border-orange-500 shadow-2xl rounded-2xl p-3 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2 z-50">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5 animate-pulse text-amber-200" />
          </div>
          <div>
            <span className="font-black text-sm text-white block">
              রেস্তোরাঁহিসাব এআই স্টুডিও
            </span>
            <span className="text-[11px] text-emerald-400 font-black flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              {formatBengaliNumber(sessions.length)}টি চ্যাট সংরক্ষিত
            </span>
          </div>
          <button
            onClick={() => setIsMinimized(false)}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
            title="বড় স্ক্রিনে খুলুন"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        /* FULL WORKSPACE CANVAS: PURE BLACK THEME & CRISP WHITE TEXT */
        <div className={`bg-[#030712] text-white flex overflow-hidden shadow-2xl transition-all border border-slate-800 ${
          isFullScreen
            ? 'w-screen h-screen rounded-none'
            : 'w-full max-w-6xl h-[88vh] rounded-3xl'
        }`}>
          {/* LEFT SIDEBAR: PURE DARK CHAT SESSIONS & PINNED LIST */}
          <div className={`w-80 sm:w-84 bg-[#070b14] border-r border-slate-800 flex flex-col shrink-0 transition-all ${
            isSidebarOpen ? 'flex' : 'hidden md:hidden'
          }`}>
            {/* Sidebar Top Header */}
            <div className="p-4 border-b border-slate-800 space-y-3 shrink-0 bg-[#070b14]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shadow-md">
                    <Sparkles className="w-5 h-5 text-amber-200" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-white">
                      এআই চ্যাট হিস্ট্রি
                    </h4>
                    <p className="text-[11px] text-slate-400 font-bold">
                      সংরক্ষিত ও পিনকৃত চ্যাট
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* + New Chat Button */}
              <button
                type="button"
                onClick={handleCreateNewSession}
                className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>নতুন কথোপকথন শুরু করুন</span>
              </button>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="পূর্ববর্তী চ্যাট খুঁজুন..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-700 bg-[#0f172a] text-white placeholder-slate-400 text-xs font-semibold focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Chat List Scroll Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4 bg-[#070b14]">
              {/* SECTION 1: PINNED CHATS */}
              {pinnedSessions.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 py-1 text-[11px] font-black text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <Pin className="w-3.5 h-3.5 fill-current text-amber-400" />
                    <span>📌 পিনকৃত চ্যাট ({formatBengaliNumber(pinnedSessions.length)})</span>
                  </div>
                  <div className="space-y-1.5">
                    {pinnedSessions.map(session => (
                      <div
                        key={session.id}
                        onClick={() => setActiveSessionId(session.id)}
                        className={`group relative p-2.5 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          activeSessionId === session.id
                            ? 'bg-[#131d33] border-orange-500 text-white shadow-md'
                            : 'bg-[#0c1220] border-amber-500/50 hover:border-amber-400 text-white'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-amber-400 text-xs">📌</span>
                            <span className="font-black text-xs text-white truncate block">
                              {session.title}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium block ml-4">
                            {formatBengaliNumber(session.messages.length)}টি মেসেজ
                          </span>
                        </div>

                        {/* Action buttons on hover */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                          <button
                            type="button"
                            onClick={e => handleTogglePinSession(session.id, e)}
                            className="p-1 rounded text-amber-400 hover:bg-slate-800 cursor-pointer"
                            title="আনপিন করুন"
                          >
                            <PinOff className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={e => handleDeleteSession(session.id, e)}
                            className="p-1 rounded text-rose-400 hover:bg-slate-800 cursor-pointer"
                            title="এই চ্যাট ডিলিট করুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION 2: ALL RECENT CHATS */}
              <div className="space-y-1">
                <div className="px-2 py-1 text-[11px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  <span>সাম্প্রতিক কথোপকথন ({formatBengaliNumber(regularSessions.length)})</span>
                </div>
                {regularSessions.length === 0 && pinnedSessions.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400 font-semibold">
                    কোনো চ্যাট পাওয়া যায়নি
                  </div>
                ) : (
                  regularSessions.map(session => (
                    <div
                      key={session.id}
                      onClick={() => setActiveSessionId(session.id)}
                      className={`group relative p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        activeSessionId === session.id
                          ? 'bg-[#131d33] border-orange-500 text-white shadow-md'
                          : 'bg-[#0c1220] border-slate-800 hover:border-slate-600 text-white'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-black text-xs text-white truncate block">
                          {session.title}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium block">
                          {formatBengaliNumber(session.messages.length)}টি বার্তা
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          type="button"
                          onClick={e => handleTogglePinSession(session.id, e)}
                          className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 cursor-pointer"
                          title="চ্যাটটি পিন করুন (উপরে রাখুন)"
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={e => handleDeleteSession(session.id, e)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                          title="এই চ্যাট ডিলিট করুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sidebar Bottom: Live Restaurant Stats Badge */}
            {restaurant && (
              <div className="p-3 border-t border-slate-800 bg-[#0c1220] shrink-0 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-black text-white">
                  <span className="flex items-center gap-1.5 truncate">
                    <Store className="w-3.5 h-3.5 text-orange-500" />
                    <span className="truncate">{restaurant.name}</span>
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <div className="text-[11px] text-slate-300 font-bold space-y-0.5">
                  <p>• মেনু আইটেম: <strong className="text-white">{formatBengaliNumber(liveFoods.length)} টি</strong></p>
                  <p>• আজকের বিক্রি: <strong className="text-orange-400 font-mono font-black">{formatTaka(todayTotalSales)}</strong></p>
                </div>
              </div>
            )}
          </div>

          {/* MAIN CHAT WORKSPACE (RIGHT SIDE): PURE BLACK BACKGROUND */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#030712]">
            {/* Top Workspace Control Bar */}
            <div className="p-3.5 sm:px-6 bg-[#070b14] border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                {/* Toggle sidebar button */}
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-200 cursor-pointer"
                  title={isSidebarOpen ? 'সাইডবার লুকান' : 'সাইডবার দেখান'}
                >
                  {isSidebarOpen ? <PanelLeftClose className="w-4 h-4 text-white" /> : <PanelLeftOpen className="w-4 h-4 text-white" />}
                </button>

                {/* Active Chat Title & Rename */}
                {editingTitleId === activeSession?.id ? (
                  <form
                    onSubmit={e => {
                      e.preventDefault();
                      handleRenameSession(activeSession.id, editTitleText);
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={editTitleText}
                      onChange={e => setEditTitleText(e.target.value)}
                      className="px-2.5 py-1 rounded-lg border-2 border-orange-500 bg-[#0f172a] text-white text-xs sm:text-sm font-bold focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 bg-orange-600 text-white rounded-lg text-xs font-bold"
                    >
                      সংরক্ষণ
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="font-black text-base sm:text-lg text-white truncate">
                      {activeSession?.title || 'রেস্তোরাঁহিসাব এআই'}
                    </h3>
                    {activeSession?.isPinned && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 text-[10px] font-black shrink-0 border border-amber-600 flex items-center gap-1">
                        <Pin className="w-3 h-3 fill-current text-amber-400" />
                        পিনকৃত
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTitleId(activeSession?.id || null);
                        setEditTitleText(activeSession?.title || '');
                      }}
                      className="text-slate-400 hover:text-white p-1"
                      title="চ্যাটের শিরোনাম পরিবর্তন করুন"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons: Pin, Delete, Mode, Fullscreen, Close */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Pinned Messages Drawer Toggle */}
                {pinnedMessages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPinnedDrawer(!showPinnedDrawer)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-950/60 border border-amber-700 text-amber-200 font-black text-xs cursor-pointer hover:bg-amber-900/60 transition-colors"
                    title="পিনকৃত গুরুত্বপূর্ণ পরামর্শ দেখুন"
                  >
                    <Bookmark className="w-3.5 h-3.5 fill-current text-amber-400" />
                    <span className="hidden sm:inline">পিনকৃত নোট</span>
                    <span className="font-mono text-white">({formatBengaliNumber(pinnedMessages.length)})</span>
                  </button>
                )}

                {/* Pin this Session */}
                {activeSession && (
                  <button
                    type="button"
                    onClick={() => handleTogglePinSession(activeSession.id)}
                    className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                      activeSession.isPinned
                        ? 'bg-amber-950 text-amber-300 border-amber-600'
                        : 'border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                    title={activeSession.isPinned ? 'চ্যাটটি আনপিন করুন' : 'চ্যাটটি পিন করে উপরে রাখুন'}
                  >
                    <Pin className={`w-4 h-4 ${activeSession.isPinned ? 'fill-current text-amber-400' : ''}`} />
                  </button>
                )}

                {/* Delete this Session */}
                {activeSession && (
                  <button
                    type="button"
                    onClick={() => handleDeleteSession(activeSession.id)}
                    className="p-2 rounded-xl border border-slate-700 hover:bg-rose-950/60 text-slate-300 hover:text-rose-400 transition-colors cursor-pointer"
                    title="এই সম্পূর্ণ চ্যাটটি ডিলিট করুন"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                {/* Speed Mode Selector */}
                <div className="flex bg-[#0f172a] p-0.5 rounded-xl border border-slate-700 text-xs font-black">
                  <button
                    type="button"
                    onClick={() => setMode('fast')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      mode === 'fast'
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                    title="⚡ অতি দ্রুত রেসপন্স (Gemini 3.1 Flash-Lite)"
                  >
                    ⚡ দ্রুত
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('general')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      mode === 'general'
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                    title="💡 গভীর বিশ্লেষণ ও পরিকল্পনা (Gemini 3.8 Flash)"
                  >
                    💡 গভীর
                  </button>
                </div>

                {/* Fullscreen Toggle */}
                <button
                  type="button"
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="p-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                  title={isFullScreen ? 'ছোট স্ক্রিন করুন' : 'সম্পূর্ণ ফুল স্ক্রিন করুন'}
                >
                  {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="বন্ধ করুন"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PINNED MESSAGES ACCORDION DRAWER */}
            {showPinnedDrawer && pinnedMessages.length > 0 && (
              <div className="p-4 bg-[#121008] border-b border-amber-700/80 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <h5 className="font-black text-xs sm:text-sm text-amber-200 flex items-center gap-1.5">
                    <Bookmark className="w-4 h-4 text-amber-400 fill-current" />
                    পিনকৃত গুরুত্বপূর্ণ পরামর্শ ও নোটসমূহ:
                  </h5>
                  <button
                    onClick={() => setShowPinnedDrawer(false)}
                    className="text-xs font-bold text-amber-400 hover:underline cursor-pointer"
                  >
                    লুকান
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-44 overflow-y-auto">
                  {pinnedMessages.map(pm => (
                    <div key={pm.id} className="p-3 rounded-xl bg-[#1c180e] border border-amber-700/60 text-xs font-semibold space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-amber-400">
                        <span>{pm.timestamp}</span>
                        <button
                          onClick={() => handleTogglePinMessage(pm.id)}
                          className="hover:text-rose-400 text-slate-400 cursor-pointer"
                          title="আনপিন করুন"
                        >
                          <PinOff className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="line-clamp-3 text-white font-medium leading-relaxed">
                        {pm.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MESSAGES SCROLL AREA: PURE BLACK CANVAS & PURE WHITE TEXT */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-5 bg-[#030712]">
              <div className="max-w-4xl mx-auto space-y-5">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'model' && (
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center shrink-0 mt-1 shadow-md">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    )}

                    <div
                      className={`relative group max-w-[90%] sm:max-w-[85%] rounded-3xl p-4 sm:p-5 shadow-lg transition-all ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white font-semibold rounded-br-xs shadow-md'
                          : msg.isPinned
                          ? 'bg-[#0e1628] border-2 border-amber-500 text-white rounded-bl-xs'
                          : 'bg-[#0c1220] border border-slate-800 text-white rounded-bl-xs'
                      }`}
                    >
                      {/* Pinned Message Header */}
                      {msg.isPinned && (
                        <div className="mb-2 pb-1.5 border-b border-amber-600/60 flex items-center justify-between text-[11px] font-black text-amber-300">
                          <span className="flex items-center gap-1">
                            <Pin className="w-3.5 h-3.5 fill-current text-amber-400" />
                            পিনকৃত গুরুত্বপূর্ণ পরামর্শ
                          </span>
                        </div>
                      )}

                      {/* Main Message Content in Pure White Text */}
                      <div className="text-white">
                        {renderFormattedText(msg.content)}
                      </div>

                      {/* Live Streaming Indicator */}
                      {msg.isStreaming && (
                        <span className="inline-block w-2.5 h-4 ml-1 bg-orange-400 animate-pulse align-middle"></span>
                      )}

                      {/* 1-Click Interactive Follow-Up Questions */}
                      {msg.suggestions && msg.suggestions.length > 0 && !msg.isStreaming && (
                        <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                          <span className="text-[11px] font-black text-orange-400 flex items-center gap-1.5 uppercase tracking-wider">
                            <HelpCircle className="w-3.5 h-3.5" />
                            পরবর্তী প্রাসঙ্গিক প্রশ্নসমূহ (১-ক্লিকে উত্তর পান):
                          </span>
                          <div className="flex flex-col sm:flex-row flex-wrap gap-1.5">
                            {msg.suggestions.map((sug, si) => (
                              <button
                                key={si}
                                type="button"
                                onClick={() => handleSendMessage(sug)}
                                className="text-left px-3 py-2 rounded-xl bg-[#131d33] hover:bg-[#1a2845] border border-slate-700 hover:border-orange-500 text-xs font-bold text-white hover:text-orange-300 transition-colors flex items-center gap-2 group cursor-pointer shadow-xs"
                              >
                                <span className="text-orange-400 font-black">→</span>
                                <span>{sug}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Message Footer Actions: Copy, Pin, Delete */}
                      <div className="flex items-center justify-between gap-3 mt-3 pt-2 border-t border-slate-800/80 text-[11px]">
                        <span className="text-slate-400 font-bold">
                          {msg.timestamp}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {/* Pin / Unpin Message */}
                          <button
                            type="button"
                            onClick={() => handleTogglePinMessage(msg.id)}
                            className={`p-1 rounded-md text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                              msg.isPinned
                                ? 'text-amber-400 bg-amber-950/80'
                                : 'text-slate-400 hover:text-amber-400'
                            }`}
                            title={msg.isPinned ? 'আনপিন করুন' : 'এই পরামর্শটি পিন করে রাখুন'}
                          >
                            <Pin className={`w-3.5 h-3.5 ${msg.isPinned ? 'fill-current text-amber-400' : ''}`} />
                            <span className="hidden sm:inline">{msg.isPinned ? 'পিন করা' : 'পিন'}</span>
                          </button>

                          {/* Copy Content */}
                          {msg.role === 'model' && (
                            <button
                              type="button"
                              onClick={() => handleCopy(msg.id, msg.content)}
                              className="text-slate-400 hover:text-white p-1 rounded flex items-center gap-1 transition-colors cursor-pointer font-bold"
                              title="কপি করুন"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span className="text-emerald-400">কপি হয়েছে</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">কপি</span>
                                </>
                              )}
                            </button>
                          )}

                          {/* Delete Message */}
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="text-slate-400 hover:text-rose-400 p-1 rounded flex items-center gap-1 transition-colors cursor-pointer"
                            title="এই মেসেজটি মুছে ফেলুন"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {msg.role === 'user' && (
                      <div className="w-9 h-9 rounded-xl bg-orange-700 text-white flex items-center justify-center shrink-0 mt-1 shadow-md">
                        <UserIcon className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex gap-3 items-center text-slate-400 text-xs py-2">
                    <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-md">
                      <Sparkles className="w-5 h-5 animate-spin text-white" />
                    </div>
                    <div className="bg-[#0c1220] border border-slate-800 px-4 py-3 rounded-3xl rounded-bl-xs flex items-center justify-between gap-4 shadow-md">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-bounce"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-bounce [animation-delay:0.2s]"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-bounce [animation-delay:0.4s]"></span>
                        <span className="text-xs sm:text-sm text-white font-bold ml-1">
                          {mode === 'fast' ? '⚡ এআই দ্রুত উত্তর প্রস্তুত করছে...' : '💡 এআই গভীর ব্যবসায়িক বিশ্লেষণ করছে...'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleStopGeneration}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-950 text-rose-300 hover:bg-rose-900 text-xs font-black cursor-pointer transition-colors"
                        title="থামান"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        থামান
                      </button>
                    </div>
                  </div>
                )}

                {/* Error Banner & Retry */}
                {errorMessage && (
                  <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-800 text-white text-xs sm:text-sm flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                      <span className="font-bold">{errorMessage}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                        if (lastUserMsg) handleSendMessage(lastUserMsg.content);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shrink-0 transition-colors cursor-pointer"
                    >
                      আবার চেষ্টা করুন
                    </button>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* BOTTOM INPUT & SMART TOPIC SUGGESTIONS: PURE BLACK BASE */}
            <div className="p-3 sm:p-5 border-t border-slate-800 bg-[#070b14] shrink-0 space-y-3 shadow-2xl">
              <div className="max-w-4xl mx-auto space-y-3">
                {/* Topic Presets Bar */}
                {messages.length <= 4 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {TOPIC_PRESETS.map(topic => {
                        const Icon = topic.icon;
                        const isActive = selectedTopic === topic.id;
                        return (
                          <button
                            key={topic.id}
                            type="button"
                            onClick={() => setSelectedTopic(topic.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                              isActive
                                ? 'bg-orange-600 text-white shadow-xs'
                                : 'bg-[#0f172a] text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{topic.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {TOPIC_PRESETS.find(t => t.id === selectedTopic)?.questions.map((q, qi) => (
                        <button
                          key={qi}
                          type="button"
                          onClick={() => handleSendMessage(q)}
                          className="px-3 py-1.5 rounded-xl text-left bg-[#0c1220] hover:bg-[#131d33] border border-slate-800 hover:border-orange-500 transition-colors text-xs font-bold text-white hover:text-orange-300 truncate cursor-pointer flex items-center gap-1.5"
                        >
                          <span className="text-orange-400 font-bold">💬</span>
                          <span className="truncate max-w-xs sm:max-w-md">{q}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input Field with Send Button */}
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-end gap-2.5"
                >
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={inputPrompt}
                    onChange={e => setInputPrompt(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="আপনার রেস্তোরাঁর যেকোনো প্রশ্ন লিখুন (যেমন: রমজান ইফতার কম্বো অফার)..."
                    className="flex-1 min-h-[48px] max-h-32 py-3 px-4 rounded-2xl border-2 border-slate-700 bg-[#0a0f1d] text-white placeholder-slate-400 text-xs sm:text-sm font-semibold resize-none focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />

                  <button
                    type="submit"
                    disabled={isLoading || !inputPrompt.trim()}
                    className="h-[48px] px-5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-40 cursor-pointer font-bold text-xs sm:text-sm shrink-0"
                    title="বার্তা পাঠান"
                  >
                    <span>পাঠান</span>
                    <Send className="w-4 h-4" />
                  </button>
                </form>

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold px-1">
                  <span>Enter = সেন্ড | Shift+Enter = নতুন লাইন | চ্যাট স্বয়ংক্রিয়ভাবে সংরক্ষিত হয়</span>
                  <span className="text-orange-400 font-mono">
                    {mode === 'fast' ? '⚡ অতি দ্রুত মোড' : '💡 গভীর বিশ্লেষণ মোড'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

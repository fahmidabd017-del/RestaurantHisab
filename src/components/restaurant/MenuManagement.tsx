import React, { useEffect, useState } from 'react';
import type { Restaurant, Category, FoodItem } from '../../types';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getFoods,
  createFood,
  updateFood,
  deleteFood,
  importStarterMenu,
  clearAllFoods,
} from '../../services/db';
import { calculateTrialStatus, formatBengaliNumber, formatTaka } from '../../utils/date';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  Lock,
  UtensilsCrossed,
  Tag,
  AlertCircle,
  CheckCircle2,
  X,
  Search,
  Zap,
  RotateCcw,
} from 'lucide-react';
import { TopAccentBar } from '../common/TopAccentBar';

interface MenuManagementProps {
  restaurant: Restaurant;
  onNavigate: (view: string) => void;
}

// Popular quick add items requested by users
const POPULAR_QUICK_ITEMS = [
  { name: 'মিষ্টি দই', price: 20, icon: '🍧', category: 'মিষ্টি ও দই' },
  { name: 'স্পেশাল ইফতারি', price: 100, icon: '🍱', category: 'ইফতার ও নাস্তা' },
  { name: 'দুধ চা', price: 15, icon: '☕', category: 'চা ও পানীয়' },
  { name: 'চিকেন বিরিয়ানি', price: 180, icon: '🍗', category: 'ভাত ও বিরিয়ানি' },
  { name: 'বিফ ভুনা', price: 170, icon: '🥩', category: 'মাছ ও মাংস' },
  { name: 'কোল্ড ড্রিংকস', price: 25, icon: '🥤', category: 'চা ও পানীয়' },
  { name: 'খিচুড়ি ও ডিম', price: 60, icon: '🍛', category: 'ভাত ও বিরিয়ানি' },
  { name: 'সিঙ্গারা (২ পিস)', price: 20, icon: '🥟', category: 'ইফতার ও নাস্তা' },
];

export const MenuManagement: React.FC<MenuManagementProps> = ({ restaurant, onNavigate }) => {
  const trialInfo = calculateTrialStatus(restaurant.trialEndsAt, restaurant.isLifetime);
  const isLocked = trialInfo.isExpired && !restaurant.isLifetime;

  const [activeTab, setActiveTab] = useState<'FOODS' | 'CATEGORIES'>('FOODS');
  const [categories, setCategories] = useState<Category[]>([]);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Category Add/Edit Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState('');

  // Food Add/Edit Modal
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [editingFood, setEditingFood] = useState<FoodItem | null>(null);
  const [foodNameInput, setFoodNameInput] = useState('');
  const [foodPriceInput, setFoodPriceInput] = useState('');
  const [foodCategoryChoice, setFoodCategoryChoice] = useState<string>('DEFAULT');
  const [foodCustomCategoryInput, setFoodCustomCategoryInput] = useState('');

  // In-App Confirm Dialog State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: '',
    onConfirm: async () => {},
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [cats, foodList] = await Promise.all([
        getCategories(restaurant.id),
        getFoods(restaurant.id),
      ]);
      setCategories(cats);
      setFoods(foodList);
    } catch (err) {
      console.error('Failed to load menu data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [restaurant.id]);

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // 1-Click Quick Add Item
  const handleQuickAddItem = async (item: { name: string; price: number; category: string }) => {
    if (isLocked) return;
    try {
      const created = await createFood(restaurant.id, {
        name: item.name,
        price: item.price,
        categoryId: 'general',
        categoryName: item.category,
      });
      setFoods(prev => [created, ...prev]);
      showNotification(`"${item.name}" (৳${formatBengaliNumber(item.price)}) সফলভাবে মেনুতে যোগ হয়েছে!`);
    } catch (err) {
      setErrorMsg('খাবার যোগ করতে সমস্যা হয়েছে।');
    }
  };

  // CATEGORY OPERATIONS
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryNameInput('');
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCategoryNameInput(cat.name);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryNameInput.trim()) return;

    try {
      if (editingCategory) {
        await updateCategory(restaurant.id, editingCategory.id, categoryNameInput.trim());
        setCategories(prev =>
          prev.map(c => (c.id === editingCategory.id ? { ...c, name: categoryNameInput.trim() } : c))
        );
        showNotification('ক্যাটাগরি সফলভাবে আপডেট হয়েছে!');
      } else {
        const created = await createCategory(restaurant.id, categoryNameInput.trim());
        setCategories(prev => [...prev, created]);
        showNotification('নতুন ক্যাটাগরি তৈরি হয়েছে!');
      }
      setIsCategoryModalOpen(false);
    } catch (err) {
      setErrorMsg('ক্যাটাগরি সংরক্ষণে সমস্যা হয়েছে।');
    }
  };

  const promptDeleteCategory = (cat: Category) => {
    setConfirmModal({
      isOpen: true,
      title: 'ক্যাটাগরি মুছে ফেলবেন?',
      description: `আপনি কি "${cat.name}" ক্যাটাগরিটি মুছে ফেলতে চান? সংশ্লিষ্ট খাবারগুলো সাধারণ ক্যাটাগরিতে থাকবে।`,
      confirmText: 'হ্যাঁ, মুছে ফেলুন',
      onConfirm: async () => {
        try {
          await deleteCategory(restaurant.id, cat.id);
          setCategories(prev => prev.filter(c => c.id !== cat.id));
          showNotification('ক্যাটাগরি মুছে ফেলা হয়েছে।');
        } catch (err) {
          setErrorMsg('ক্যাটাগরি মুছতে সমস্যা হয়েছে।');
        }
      },
    });
  };

  // FOOD OPERATIONS
  const handleOpenAddFood = () => {
    setEditingFood(null);
    setFoodNameInput('');
    setFoodPriceInput('');
    setFoodCategoryChoice(categories.length > 0 ? categories[0].name : 'DEFAULT');
    setFoodCustomCategoryInput('');
    setIsFoodModalOpen(true);
  };

  const handleOpenEditFood = (food: FoodItem) => {
    setEditingFood(food);
    setFoodNameInput(food.name);
    setFoodPriceInput(String(food.price));
    if (categories.some(c => c.name === food.categoryName)) {
      setFoodCategoryChoice(food.categoryName || 'DEFAULT');
      setFoodCustomCategoryInput('');
    } else if (food.categoryName && food.categoryName !== 'সাধারণ') {
      setFoodCategoryChoice('CUSTOM');
      setFoodCustomCategoryInput(food.categoryName);
    } else {
      setFoodCategoryChoice('DEFAULT');
      setFoodCustomCategoryInput('');
    }
    setIsFoodModalOpen(true);
  };

  const handleSaveFood = async (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(foodPriceInput);
    if (!foodNameInput.trim() || isNaN(price) || price < 0) {
      setErrorMsg('সঠিক নাম ও মূল্য প্রদান করুন।');
      return;
    }

    let finalCategoryName = 'সাধারণ';
    let finalCategoryId = 'general';

    if (foodCategoryChoice === 'CUSTOM') {
      finalCategoryName = foodCustomCategoryInput.trim() || 'সাধারণ';
    } else if (foodCategoryChoice !== 'DEFAULT') {
      finalCategoryName = foodCategoryChoice;
      const matchedCat = categories.find(c => c.name === foodCategoryChoice);
      if (matchedCat) finalCategoryId = matchedCat.id;
    }

    try {
      if (editingFood) {
        await updateFood(restaurant.id, editingFood.id, {
          name: foodNameInput.trim(),
          price,
          categoryId: finalCategoryId,
          categoryName: finalCategoryName,
        });
        setFoods(prev =>
          prev.map(f =>
            f.id === editingFood.id
              ? {
                  ...f,
                  name: foodNameInput.trim(),
                  price,
                  categoryId: finalCategoryId,
                  categoryName: finalCategoryName,
                }
              : f
          )
        );
        showNotification('খাবার আইটেম সফলভাবে আপডেট হয়েছে!');
      } else {
        const created = await createFood(restaurant.id, {
          name: foodNameInput.trim(),
          price,
          categoryId: finalCategoryId,
          categoryName: finalCategoryName,
        });
        setFoods(prev => [created, ...prev]);
        showNotification('নতুন খাবার আইটেম সফলভাবে যুক্ত হয়েছে!');
      }
      setIsFoodModalOpen(false);
    } catch (err) {
      setErrorMsg('খাবার সংরক্ষণে সমস্যা হয়েছে।');
    }
  };

  const promptDeleteFood = (food: FoodItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'খাবার আইটেম মুছে ফেলবেন?',
      description: `আপনি কি নিশ্চিত যে "${food.name}" খাবারটি তালিকা থেকে মুছে ফেলতে চান?`,
      confirmText: 'হ্যাঁ, মুছুন',
      onConfirm: async () => {
        try {
          await deleteFood(restaurant.id, food.id);
          setFoods(prev => prev.filter(f => f.id !== food.id));
          showNotification('খাবার আইটেম তালিকা থেকে সরানো হয়েছে।');
        } catch (err) {
          setErrorMsg('খাবার মুছতে সমস্যা হয়েছে।');
        }
      },
    });
  };

  // Clear all foods
  const promptClearAllFoods = () => {
    setConfirmModal({
      isOpen: true,
      title: 'সম্পূর্ণ মেনু খালি করবেন?',
      description: 'আপনার বর্তমান সব খাবার আইটেম মুছে যাবে এবং মেনু একদম খালি হয়ে যাবে। আপনি একদম নতুন করে খাবার যোগ করতে পারবেন।',
      confirmText: 'হ্যাঁ, সব মুছুন',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await clearAllFoods(restaurant.id);
          setFoods([]);
          showNotification('মেনুর সকল খাবার মুছে খালি করা হয়েছে।');
        } catch (err) {
          setErrorMsg('মেনু খালি করতে সমস্যা হয়েছে।');
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  // Starter menu auto-import
  const promptImportStarter = () => {
    setConfirmModal({
      isOpen: true,
      title: 'রেডিমেড খাবার মেনু যোগ করবেন?',
      description: 'এতে ভাত, বিরিয়ানি, মিষ্টি দই (২০ টাকা), ইফতারি বক্স (১০০ টাকা), চা ও পানীয়র সাধারণ তালিকা এক ক্লিকে যুক্ত হবে।',
      confirmText: 'হ্যাঁ, যুক্ত করুন',
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await importStarterMenu(restaurant.id);
          await loadData();
          showNotification('রেডিমেড খাবার তালিকা সফলভাবে যুক্ত হয়েছে!');
        } catch (err) {
          setErrorMsg('মেনু ইমপোর্টে সমস্যা হয়েছে।');
        } finally {
          setIsLoading(false);
        }
      },
    });
  };

  // Filter foods by search & category
  const filteredFoods = foods.filter(food => {
    const matchesSearch =
      food.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      (food.categoryName && food.categoryName.toLowerCase().includes(searchQuery.trim().toLowerCase()));
    const matchesCat =
      selectedCategoryFilter === 'ALL' ||
      (selectedCategoryFilter === 'UNCATEGORIZED' && (!food.categoryName || food.categoryName === 'সাধারণ')) ||
      food.categoryName === selectedCategoryFilter;
    return matchesSearch && matchesCat;
  });

  if (isLocked) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="relative overflow-hidden bg-[#0E1524] border border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-2xl">
          <TopAccentBar variant="rose" />
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-400 flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">
            আপনার ফ্রি ট্রায়ালের মেয়াদ শেষ হয়েছে
          </h2>
          <p className="text-sm text-slate-300">
            মেনু পরিবর্তন করতে বা নতুন খাবার যোগ করতে অনুগ্রহ করে লাইফটাইম অ্যাক্সেস সক্রিয় করুন।
          </p>
          <button
            onClick={() => onNavigate('payment')}
            className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md cursor-pointer transition-colors"
          >
            লাইফটাইম পেমেন্ট করুন
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-orange-400" />
            খাবার তালিকা ও মেনু ব্যবস্থাপনা
          </h1>
          <p className="text-xs text-slate-300 mt-0.5">
            সহজে খাবার যোগ করুন, বিক্রয় মূল্য পরিবর্তন করুন ও দ্রুত বিলিংয়ের জন্য প্রস্তুত রাখুন
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {foods.length > 0 && (
            <button
              onClick={promptClearAllFoods}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-800/70 bg-rose-950/40 text-rose-300 font-semibold text-xs hover:bg-rose-900/50 transition-colors cursor-pointer"
              title="সকল খাবার মুছে নতুন করে শুরু করুন"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              মেনু খালি করুন
            </button>
          )}

          <button
            onClick={promptImportStarter}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#111927] border border-amber-500/40 text-amber-300 font-bold text-xs hover:bg-[#151E2E] transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            রেডিমেড মেনু যোগ
          </button>

          <button
            onClick={handleOpenAddFood}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs shadow-sm shadow-orange-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + নতুন খাবার যোগ করুন
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="relative overflow-hidden p-3 rounded-xl bg-[#0E1524] border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
          <TopAccentBar variant="emerald" />
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="relative overflow-hidden p-3 rounded-xl bg-[#0E1524] border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
          <TopAccentBar variant="rose" />
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-auto text-rose-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1-CLICK QUICK ADD PANEL */}
      <div className="relative overflow-hidden bg-[#0E1524] p-5 rounded-2xl border border-slate-800 shadow-xl space-y-3">
        <TopAccentBar variant="amber" />
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center shadow-sm">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-xs sm:text-sm text-white">
                ১-ক্লিকে জনপ্রিয় খাবার যোগ করুন
              </h3>
              <p className="text-[11px] text-slate-300">
                ক্লিক করলেই সরাসরি আপনার রেস্তোরাঁর মেনু তালিকায় যুক্ত হয়ে যাবে:
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-amber-300">
            ঝটপট আইটেম
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 relative z-10">
          {POPULAR_QUICK_ITEMS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleQuickAddItem(item)}
              className="relative overflow-hidden p-3 rounded-xl bg-[#111927] border border-slate-800 hover:border-orange-500/70 hover:bg-[#151E2E] text-left transition-all active:scale-95 group flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg shrink-0">{item.icon}</span>
                <div className="min-w-0">
                  <span className="font-bold text-xs text-white truncate block">
                    {item.name}
                  </span>
                  <span className="text-[11px] font-extrabold text-amber-300">
                    {formatTaka(item.price)}
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-slate-400 group-hover:text-orange-400 font-bold shrink-0">
                + যোগ
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('FOODS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'FOODS'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-[#111927] text-slate-300 hover:bg-[#151E2E] hover:text-white border border-slate-800'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            সকল খাবার ({formatBengaliNumber(foods.length)})
          </button>

          <button
            onClick={() => setActiveTab('CATEGORIES')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'CATEGORIES'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-[#111927] text-slate-300 hover:bg-[#151E2E] hover:text-white border border-slate-800'
            }`}
          >
            <Tag className="w-4 h-4" />
            ক্যাটাগরি ম্যানেজমেন্ট ({formatBengaliNumber(categories.length)})
          </button>
        </div>

        {activeTab === 'FOODS' && (
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="খাবারের নাম দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-400 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* TAB 1: FOOD ITEMS LIST */}
      {activeTab === 'FOODS' && (
        <div className="space-y-4">
          {/* Category Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategoryFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategoryFilter === 'ALL'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-[#111927] border border-slate-800 text-slate-300 hover:bg-[#151E2E] hover:text-white'
              }`}
            >
              সকল খাবার ({formatBengaliNumber(foods.length)})
            </button>

            {Array.from(new Set(foods.map(f => f.categoryName || 'সাধারণ'))).map(catName => (
              <button
                key={catName}
                onClick={() => setSelectedCategoryFilter(catName)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategoryFilter === catName
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-[#111927] border border-slate-800 text-slate-300 hover:bg-[#151E2E] hover:text-white'
                }`}
              >
                {catName} ({formatBengaliNumber(foods.filter(f => (f.categoryName || 'সাধারণ') === catName).length)})
              </button>
            ))}
          </div>

          <div className="relative overflow-hidden bg-[#0E1524] rounded-2xl border border-slate-800 shadow-xl">
            <TopAccentBar variant="emerald" />
            {isLoading ? (
              <div className="p-12 text-center text-sm text-slate-300">খাবার লোড হচ্ছে...</div>
            ) : foods.length === 0 ? (
              <div className="p-12 text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-orange-950/60 border border-orange-500/40 text-orange-400 flex items-center justify-center">
                  <UtensilsCrossed className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-base">
                    মেনুতে এখনও কোনো খাবার যোগ করা হয়নি
                  </h4>
                  <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                    উপরে জনপ্রিয় খাবারের বক্সে ক্লিক করে সরাসরি মিষ্টি দই বা ইফতারি যোগ করতে পারেন, অথবা "+ নতুন খাবার যোগ করুন" বাটনে চাপুন।
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={promptImportStarter}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                  >
                    রেডিমেড মেনু যোগ করুন
                  </button>
                  <button
                    onClick={handleOpenAddFood}
                    className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                  >
                    + কাস্টম খাবার যোগ করুন
                  </button>
                </div>
              </div>
            ) : filteredFoods.length === 0 ? (
              <div className="p-12 text-center text-sm text-slate-300">
                কোনো খাবার পাওয়া যায়নি।
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#111927] border-b border-slate-800 text-slate-300">
                    <tr>
                      <th className="px-6 py-3.5 font-semibold">খাবারের নাম</th>
                      <th className="px-6 py-3.5 font-semibold">ক্যাটাগরি</th>
                      <th className="px-6 py-3.5 font-semibold text-right">বিক্রয় মূল্য</th>
                      <th className="px-6 py-3.5 font-semibold text-center">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredFoods.map(food => (
                      <tr key={food.id} className="bg-[#0B0F17] hover:bg-[#151E2E]/70 transition-colors">
                        <td className="px-6 py-3.5 font-bold text-white text-sm">
                          {food.name}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="px-2.5 py-1 rounded-lg bg-[#151E2E] border border-slate-700 text-slate-200 font-medium text-[11px]">
                            {food.categoryName || 'সাধারণ'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right font-extrabold text-amber-300 text-sm">
                          {formatTaka(food.price)}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditFood(food)}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-blue-400 hover:bg-blue-950/50 cursor-pointer transition-colors"
                              title="সম্পাদনা করুন"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => promptDeleteFood(food)}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-rose-400 hover:bg-rose-950/50 cursor-pointer transition-colors"
                              title="মুছে ফেলুন"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORIES LIST */}
      {activeTab === 'CATEGORIES' && (
        <div className="relative overflow-hidden bg-[#0E1524] rounded-2xl border border-slate-800 shadow-xl p-6 space-y-4">
          <TopAccentBar variant="violet" />
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 relative z-10">
            <div>
              <h3 className="font-bold text-white text-sm">
                রেস্তোরাঁর ক্যাটাগরিসমূহ
              </h3>
              <p className="text-xs text-slate-300">
                ক্যাটাগরি তৈরি করে খাবারগুলোকে সুন্দরভাবে গ্রুপ করতে পারেন (যেমন: মিষ্টি, ইফতারি, বিরিয়ানি)
              </p>
            </div>
            <button
              onClick={handleOpenAddCategory}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-600 text-white font-bold text-xs shadow-sm hover:bg-orange-500 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              নতুন ক্যাটাগরি
            </button>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm text-slate-300">ক্যাটাগরি লোড হচ্ছে...</div>
          ) : categories.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <p className="text-xs text-slate-300">কোনো নির্দিষ্ট ক্যাটাগরি তৈরি করা হয়নি। খাবার সরাসরি সাধারণ গ্রুপে আছে।</p>
              <button
                onClick={handleOpenAddCategory}
                className="text-xs font-bold text-orange-400 hover:underline cursor-pointer"
              >
                + একটি নতুন ক্যাটাগরি তৈরি করুন
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 relative z-10">
              {categories.map(cat => {
                const count = foods.filter(f => f.categoryId === cat.id || f.categoryName === cat.name).length;
                return (
                  <div
                    key={cat.id}
                    className="relative overflow-hidden p-4 rounded-xl border border-slate-800 bg-[#111927] flex items-center justify-between"
                  >
                    <TopAccentBar variant="blue" />
                    <div>
                      <h4 className="font-bold text-white text-sm">
                        {cat.name}
                      </h4>
                      <span className="text-xs text-slate-300">
                        {formatBengaliNumber(count)} টি খাবার আইটেম
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditCategory(cat)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-blue-400 hover:bg-blue-950/50 cursor-pointer"
                        title="নাম পরিবর্তন করুন"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => promptDeleteCategory(cat)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-rose-400 hover:bg-rose-950/50 cursor-pointer"
                        title="ক্যাটাগরি মুছুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CATEGORY ADD/EDIT MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative overflow-hidden bg-[#0E1524] text-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-800 p-5 space-y-4">
            <TopAccentBar variant="violet" />
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 relative z-10">
              <h3 className="font-bold text-sm text-white">
                {editingCategory ? 'ক্যাটাগরি সম্পাদনা' : 'নতুন ক্যাটাগরি তৈরি'}
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="space-y-3 relative z-10">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  ক্যাটাগরির নাম *
                </label>
                <input
                  type="text"
                  required
                  value={categoryNameInput}
                  onChange={e => setCategoryNameInput(e.target.value)}
                  placeholder="যেমন: বিরিয়ানি / মিষ্টি ও দই / ইফতারি"
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-400 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="w-1/2 py-2 rounded-xl border border-slate-700 bg-[#151E2E] text-white text-xs font-semibold hover:bg-[#1E293B] cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs cursor-pointer"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOOD ADD/EDIT MODAL */}
      {isFoodModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative overflow-hidden bg-[#0E1524] text-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-800 p-5 space-y-4">
            <TopAccentBar variant="amber" />
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 relative z-10">
              <h3 className="font-bold text-sm text-white">
                {editingFood ? 'খাবার আইটেম সম্পাদনা' : 'নতুন খাবার যুক্ত করুন'}
              </h3>
              <button
                onClick={() => setIsFoodModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveFood} className="space-y-3.5 relative z-10">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  খাবারের নাম *
                </label>
                <input
                  type="text"
                  required
                  value={foodNameInput}
                  onChange={e => setFoodNameInput(e.target.value)}
                  placeholder="যেমন: মিষ্টি দই / স্পেশাল ইফতারি / চিকেন বিরিয়ানি"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-400 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  বিক্রয় মূল্য (টাকা ৳) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  step="any"
                  value={foodPriceInput}
                  onChange={e => setFoodPriceInput(e.target.value)}
                  placeholder="যেমন: 20 অথবা 100"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-400 text-xs font-mono focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  ক্যাটাগরি (ঐচ্ছিক)
                </label>
                <select
                  value={foodCategoryChoice}
                  onChange={e => setFoodCategoryChoice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="DEFAULT" className="bg-[#0B0F17] text-white">সাধারণ (কোনো নির্দিষ্ট ক্যাটাগরি ছাড়া)</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name} className="bg-[#0B0F17] text-white">
                      {cat.name}
                    </option>
                  ))}
                  <option value="CUSTOM" className="bg-[#0B0F17] text-white">+ নতুন কোনো ক্যাটাগরি লিখুন</option>
                </select>

                {foodCategoryChoice === 'CUSTOM' && (
                  <input
                    type="text"
                    value={foodCustomCategoryInput}
                    onChange={e => setFoodCustomCategoryInput(e.target.value)}
                    placeholder="ক্যাটাগরির নাম লিখুন (যেমন: মিষ্টি ও দই / ইফতারি)"
                    className="mt-2 w-full px-3 py-2 rounded-xl border border-slate-700 bg-[#0B0F17] text-white placeholder:text-slate-400 text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFoodModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-700 bg-[#151E2E] text-white text-xs font-semibold hover:bg-[#1E293B] cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold text-xs shadow-sm hover:from-orange-600 hover:to-amber-700 cursor-pointer"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-APP CONFIRMATION MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative overflow-hidden bg-[#0E1524] text-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-800 p-5 space-y-4">
            <TopAccentBar variant="rose" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  {confirmModal.description}
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2 relative z-10">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="w-1/2 py-2 rounded-xl border border-slate-700 bg-[#151E2E] text-white text-xs font-semibold hover:bg-[#1E293B] cursor-pointer"
              >
                না, বাতিল
              </button>
              <button
                type="button"
                onClick={async () => {
                  setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  await confirmModal.onConfirm();
                }}
                className="w-1/2 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm cursor-pointer"
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


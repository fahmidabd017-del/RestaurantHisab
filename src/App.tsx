/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SiteSettingsProvider, useSiteSettings } from './context/SiteSettingsContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { Home } from './components/public/Home';
import { RegisterModal } from './components/auth/RegisterModal';
import { LoginModal } from './components/auth/LoginModal';
import { ForgotPasswordModal } from './components/auth/ForgotPasswordModal';
import { Dashboard } from './components/restaurant/Dashboard';
import { NewBill } from './components/restaurant/NewBill';
import { BillHistory } from './components/restaurant/BillHistory';
import { MenuManagement } from './components/restaurant/MenuManagement';
import { PaymentAccess } from './components/restaurant/PaymentAccess';
import { ProfileSettings } from './components/restaurant/ProfileSettings';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AnnouncementBanner } from './components/common/AnnouncementBanner';
import { RestaurantSidebar } from './components/common/RestaurantSidebar';
import { AiChatbotModal } from './components/ai/AiChatbotModal';
import { Sparkles } from 'lucide-react';
import { getAdminNotifications } from './services/db';

function MainApp() {
  const { restaurant, isAdmin, refreshRestaurant } = useAuth();
  const { settings } = useSiteSettings();
  const [currentView, setCurrentView] = useState<string>('home');

  // Modals state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isForgotPassOpen, setIsForgotPassOpen] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string | undefined>(undefined);

  // Admin unread notifications count
  const [adminNotifCount, setAdminNotifCount] = useState(0);

  // Update view when restaurant logs in or logs out
  useEffect(() => {
    if (isAdmin) {
      if (!currentView.startsWith('admin-')) {
        setCurrentView('admin-dashboard');
      }
    } else if (restaurant) {
      if (
        currentView === 'home' ||
        currentView === 'features' ||
        currentView === 'pricing' ||
        currentView === 'about' ||
        currentView === 'contact' ||
        currentView === 'admin-login'
      ) {
        setCurrentView('dashboard');
      }
    } else {
      if (
        currentView.startsWith('admin-') ||
        ['dashboard', 'new-bill', 'bills', 'menu', 'payment', 'profile'].includes(currentView)
      ) {
        setCurrentView('home');
      }
    }
  }, [restaurant, isAdmin]);

  // Load unread notifications if admin
  useEffect(() => {
    if (isAdmin) {
      getAdminNotifications()
        .then(notifs => {
          setAdminNotifCount(notifs.filter(n => !n.isRead).length);
        })
        .catch(() => {});
    }
  }, [isAdmin, currentView]);

  return (
    <div
      className={`min-h-screen bg-[#0B0F17] text-white flex flex-col font-sans transition-colors ${
        restaurant && !isAdmin ? 'lg:pl-72' : ''
      }`}
    >
      {/* Persistent Left Sidebar for Restaurant Tenant */}
      {restaurant && !isAdmin && (
        <RestaurantSidebar
          currentView={currentView}
          onNavigate={view => {
            setCurrentView(view);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onToggleAiChat={() => setIsAiChatOpen(prev => !prev)}
        />
      )}

      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={view => {
          setCurrentView(view);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenRegister={() => setIsRegisterOpen(true)}
        adminNotificationCount={adminNotifCount}
        onToggleAiChat={() => setIsAiChatOpen(prev => !prev)}
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* PUBLIC VIEWS */}
        {!restaurant && !isAdmin && (
          <>
            {currentView === 'admin-login' ? (
              <AdminLogin
                onSuccess={() => setCurrentView('admin-dashboard')}
                onCancel={() => setCurrentView('home')}
              />
            ) : (
              <Home
                onOpenRegister={() => setIsRegisterOpen(true)}
                onOpenLogin={() => setIsLoginOpen(true)}
                onNavigate={view => {
                  setCurrentView(view);
                  const el = document.getElementById(view);
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                lifetimeFee={settings.lifetimeFee}
                bkashNumber={settings.bkashNumber}
                nagadNumber={settings.nagadNumber}
              />
            )}
          </>
        )}

        {/* RESTAURANT TENANT VIEWS */}
        {restaurant && !isAdmin && (
          <>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
              <AnnouncementBanner />
            </div>

            {currentView === 'dashboard' && (
              <Dashboard
                restaurant={restaurant}
                onNavigate={view => setCurrentView(view)}
              />
            )}

            {currentView === 'new-bill' && (
              <NewBill
                restaurant={restaurant}
                onNavigate={view => setCurrentView(view)}
              />
            )}

            {currentView === 'bills' && (
              <BillHistory
                restaurant={restaurant}
                onNavigate={view => setCurrentView(view)}
              />
            )}

            {currentView === 'menu' && (
              <MenuManagement
                restaurant={restaurant}
                onNavigate={view => setCurrentView(view)}
              />
            )}

            {currentView === 'payment' && (
              <PaymentAccess
                restaurant={restaurant}
                onRefreshRestaurant={refreshRestaurant}
              />
            )}

            {currentView === 'profile' && (
              <ProfileSettings
                restaurant={restaurant}
                onRefresh={refreshRestaurant}
                onDeleted={() => setCurrentView('home')}
              />
            )}
          </>
        )}

        {/* SUPER ADMIN VIEWS */}
        {isAdmin && (
          <>
            {currentView === 'admin-dashboard' && (
              <AdminDashboard initialSubTab="dashboard" />
            )}
            {currentView === 'admin-restaurants' && (
              <AdminDashboard initialSubTab="restaurants" />
            )}
            {currentView === 'admin-payments' && (
              <AdminDashboard initialSubTab="payments" />
            )}
            {currentView === 'admin-settings' && (
              <AdminDashboard initialSubTab="settings" />
            )}
            {currentView === 'admin-notifications' && (
              <AdminDashboard initialSubTab="notifications" />
            )}
          </>
        )}
      </main>

      {/* Footer (shown on public and restaurant pages) */}
      {!isAdmin && (
        <Footer
          onNavigate={view => {
            setCurrentView(view);
            const el = document.getElementById(view);
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          onOpenRegister={() => setIsRegisterOpen(true)}
        />
      )}

      {/* AUTH MODALS */}
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSwitchToLogin={() => {
          setIsRegisterOpen(false);
          setIsLoginOpen(true);
        }}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSwitchToRegister={() => {
          setIsLoginOpen(false);
          setIsRegisterOpen(true);
        }}
        onOpenForgotPassword={() => {
          setIsLoginOpen(false);
          setIsForgotPassOpen(true);
        }}
      />

      <ForgotPasswordModal
        isOpen={isForgotPassOpen}
        onClose={() => setIsForgotPassOpen(false)}
        onSuccessLogin={() => {
          setIsForgotPassOpen(false);
          setIsLoginOpen(true);
        }}
      />

      {/* AI Assistant Floating Action Button */}
      {!isAiChatOpen && (
        <button
          onClick={() => setIsAiChatOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all group cursor-pointer border border-orange-400/30"
          title={`${settings.siteName} এআই সহকারীর সাথে কথা বলুন`}
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-200" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-orange-600" />
          </div>
          <span className="hidden sm:inline">এআই সহকারী</span>
          <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-extrabold uppercase">
            AI
          </span>
        </button>
      )}

      {/* Multi-turn AI Chatbot Modal */}
      <AiChatbotModal
        restaurant={restaurant}
        isOpen={isAiChatOpen}
        initialPrompt={aiInitialPrompt}
        onClose={() => {
          setIsAiChatOpen(false);
          setAiInitialPrompt(undefined);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SiteSettingsProvider>
        <AuthProvider>
          <MainApp />
        </AuthProvider>
      </SiteSettingsProvider>
    </ThemeProvider>
  );
}

// App Logic for Office Expense Dashboard with Multi-tab Views and Supabase Cloud Integration
try {

// Safe Storage Helper to prevent crashes if localStorage is disabled/sandboxed
const safeStorage = {
  getItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      console.warn("Storage access denied:", e);
      return null;
    }
  },
  setItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      console.warn("Storage access denied:", e);
    }
  },
  removeItem(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      console.warn("Storage access denied:", e);
    }
  }
};

let supabase;

try {
  if (!window.supabase) {
    throw new Error("Supabase library failed to load from CDN. Please check your internet connection.");
  }
  
  const { createClient } = window.supabase;
  const supabaseUrl = 'https://ftztxkoadifodfxukcrr.supabase.co';
  const supabaseAnonKey = 'sb_publishable_IROsjOmbckziFgGKYk0RQA_Tba50fq3';
  
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: safeStorage,
      persistSession: true,
      detectSessionInUrl: false
    }
  });
} catch (e) {
  alert("Database connection error: " + e.message);
}

let isDemoMode = false;

// 2. Default Seed Data (Pre-populates database if empty)
const INITIAL_TRANSACTIONS = [
  { date: "2026-07-07", item: "Dhood", category: "milk", amount: 150 },
  { date: "2026-07-07", item: "Dhani bhaly", category: "snacks", amount: 150 },
  { date: "2026-07-07", item: "party", category: "food", amount: 1000 },
  { date: "2026-07-08", item: "Dhood", category: "milk", amount: 150 },
  { date: "2026-07-08", item: "Biscutes", category: "snacks", amount: 140 },
  { date: "2026-07-08", item: "Roti", category: "food", amount: 80 },
  { date: "2026-07-09", item: "Dahai bhaly", category: "snacks", amount: 150 },
  { date: "2026-07-09", item: "Dhood", category: "milk", amount: 150 },
  { date: "2026-07-09", item: "khana", category: "food", amount: 520 },
  { date: "2026-07-11", item: "dhai bhaly", category: "snacks", amount: 150 },
  { date: "2026-07-11", item: "cheni", category: "tea-sugar", amount: 90 },
  { date: "2026-07-11", item: "pati", category: "tea-sugar", amount: 100 },
  { date: "2026-07-11", item: "Dhood", category: "milk", amount: 150 },
  { date: "2026-07-13", item: "Dhood", category: "milk", amount: 150 },
  { date: "2026-07-15", item: "dhood", category: "milk", amount: 100 },
  { date: "2026-07-15", item: "Biscute", category: "snacks", amount: 80 },
  { date: "2026-07-15", item: "pelats", category: "household", amount: 1120 },
  { date: "2026-07-16", item: "dhood", category: "milk", amount: 150 },
  { date: "2026-07-17", item: "dhood", category: "milk", amount: 150 },
  { date: "2026-07-18", item: "nashta", category: "food", amount: 280 },
  { date: "2026-07-18", item: "pati", category: "tea-sugar", amount: 100 },
  { date: "2026-07-18", item: "dhood", category: "milk", amount: 250 },
  { date: "2026-07-20", item: "coffee", category: "tea-sugar", amount: 70 },
  { date: "2026-07-20", item: "pudina", category: "other", amount: 20 },
  { date: "2026-07-20", item: "chini", category: "tea-sugar", amount: 150 },
  { date: "2026-07-20", item: "dhood", category: "milk", amount: 220 },
  { date: "2026-07-21", item: "Dhood", category: "milk", amount: 200 },
  { date: "2026-07-23", item: "dhood", category: "milk", amount: 170 },
  { date: "2026-07-23", item: "Pati", category: "tea-sugar", amount: 100 },
  { date: "2026-07-24", item: "dhood", category: "milk", amount: 150 },
  { date: "2026-07-24", item: "dahi bhali", category: "snacks", amount: 150 },
  { date: "2026-07-25", item: "Dhood", category: "milk", amount: 150 }
];

const INITIAL_FUNDING = [
  { source: "Initial Funding Deposit", date: "2026-07-01", amount: 3000 },
  { source: "Mid-month Topup", date: "2026-07-15", amount: 2500 }
];

function makeInitialDataDynamic() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  
  // Shift INITIAL_TRANSACTIONS to the current month dynamically
  INITIAL_TRANSACTIONS.forEach(tx => {
    const day = tx.date.split('-')[2];
    tx.date = `${year}-${month}-${day}`;
  });
  
  // Shift INITIAL_FUNDING to the current month dynamically
  INITIAL_FUNDING.forEach(f => {
    const day = f.date.split('-')[2];
    f.date = `${year}-${month}-${day}`;
  });
}

const DEFAULT_LIMIT = 10000;

// State management variables
let transactions = [];
let fundingHistory = [];
let monthlyLimit = parseFloat(safeStorage.getItem('office_monthly_limit')) || DEFAULT_LIMIT;
let chats = [];

// Session and Profiles variables
let currentUser = null;
let currentProfile = null;
let chatSubscription = null;

// Category metadata config (can be customized by user)
let CATEGORY_META = {
  milk: { name: "Milk (Dhood)", color: "#3b82f6" },
  food: { name: "Khana / Meals", color: "#10b981" },
  snacks: { name: "Snacks", color: "#f59e0b" },
  "tea-sugar": { name: "Tea & Sugar", color: "#a855f7" },
  household: { name: "Household / Plates", color: "#ec4899" },
  other: { name: "Other Expenses", color: "#64748b" }
};

let userCategories = [];

function loadCategories() {
  if (!currentUser) return;
  const saved = safeStorage.getItem(`office_categories_${currentUser.id}`);
  if (saved) {
    userCategories = JSON.parse(saved);
  } else {
    // Clean, default categories for new users
    userCategories = [
      { id: 'food', name: 'Food / Meals', color: '#10b981' },
      { id: 'travel', name: 'Travel / Fuel', color: '#3b82f6' },
      { id: 'utilities', name: 'Utilities / Bills', color: '#f59e0b' },
      { id: 'office-supplies', name: 'Office Supplies', color: '#a855f7' },
      { id: 'other', name: 'Other Expenses', color: '#64748b' }
    ];
    safeStorage.setItem(`office_categories_${currentUser.id}`, JSON.stringify(userCategories));
  }
  
  // Rebuild CATEGORY_META dynamically
  CATEGORY_META = {};
  userCategories.forEach(cat => {
    CATEGORY_META[cat.id] = { name: cat.name, color: cat.color };
  });
  
  populateCategoryDropdowns();
}

function populateCategoryDropdowns() {
  const expenseCategory = document.getElementById('expense-category');
  const categoryFilter = document.getElementById('category-filter');
  const advCategoryFilter = document.getElementById('adv-category-filter');
  
  if (expenseCategory) {
    expenseCategory.innerHTML = '';
    userCategories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      expenseCategory.appendChild(opt);
    });
  }
  
  if (categoryFilter) {
    categoryFilter.innerHTML = '<option value="all">All Categories</option>';
    userCategories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      categoryFilter.appendChild(opt);
    });
  }
  
  if (advCategoryFilter) {
    advCategoryFilter.innerHTML = '<option value="all">All Categories</option>';
    userCategories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      advCategoryFilter.appendChild(opt);
    });
  }
}

// Calendar Helper State
let currentCalDate = new Date(2026, 6, 1); // July 2026

// Chart Instances
let reportChartInstance = null;
let gaugeChartInstance = null;
let reportsPieChartInstance = null;

// Tab descriptions
const TAB_DESCRIPTIONS = {
  "dashboard-view": { title: "Dashboard", sub: "Welcome back! Here's your office expenses summary." },
  "payments-view": { title: "Received Funding", sub: "Track incoming funding and manage office deposits." },
  "transactions-view": { title: "Transactions", sub: "Search, filter, and export detailed office logs." },
  "support-view": { title: "Live Support Helpdesk", sub: "Get 24/7 assistance for your office expenses." },
  "reports-view": { title: "Analytics & Reports", sub: "Detailed graphs and key insights of your spending." },
  "calendar-view": { title: "Calendar View", sub: "Track dates of office expenses visually." },
  "settings-view": { title: "Account Settings", sub: "Update your profile details, avatar, and security." }
};

// UI Elements (declared globally, populated on DOMContentLoaded)
let searchInput, pageTitle, pageSubtitle, themeToggleBtn;
let metricReceived, metricSpent, metricSpentSub, metricRemaining, metricRemainingSub, metricBalance, metricBalanceSub;
let transactionRows, categoryFilter, reportFilter, categoryListContainer, budgetPctText, budgetAlertMsg, addExpenseForm, editLimitBtn;
let paymentRows, addFundingForm;
let detailedTransactionRows, advCategoryFilter, advSortFilter, advStartDate, advEndDate, resetFiltersBtn, exportCsvBtn, filteredStatsText;
let chatFeed, chatForm, chatInput;
let financialInsightsBox;
let calendarCells, calendarMonthYear, calPrevBtn, calNextBtn;
let authForm, authTitle, authSubtitle, authSubmitBtn, authToggleLink, authToggleText, authUsernameGroup, authUsername, authEmail, authPassword, logoutBtn, userDisplayName, userDisplayRole;

function initializeDOMElements() {
  searchInput = document.getElementById('search-input');
  pageTitle = document.getElementById('page-title');
  pageSubtitle = document.getElementById('page-subtitle');
  themeToggleBtn = document.getElementById('theme-toggle');
  
  metricReceived = document.getElementById('metric-received');
  metricSpent = document.getElementById('metric-spent');
  metricSpentSub = document.getElementById('metric-spent-sub');
  metricRemaining = document.getElementById('metric-remaining');
  metricRemainingSub = document.getElementById('metric-remaining-sub');
  metricBalance = document.getElementById('metric-balance');
  metricBalanceSub = document.getElementById('metric-balance-sub');
  
  transactionRows = document.getElementById('transaction-rows');
  categoryFilter = document.getElementById('category-filter');
  reportFilter = document.getElementById('report-filter');
  categoryListContainer = document.getElementById('category-list-container');
  budgetPctText = document.getElementById('budget-pct-text');
  budgetAlertMsg = document.getElementById('budget-alert-msg');
  addExpenseForm = document.getElementById('add-expense-form');
  editLimitBtn = document.getElementById('edit-limit-btn');
  
  paymentRows = document.getElementById('payment-rows');
  addFundingForm = document.getElementById('add-funding-form');
  
  detailedTransactionRows = document.getElementById('detailed-transaction-rows');
  advCategoryFilter = document.getElementById('adv-category-filter');
  advSortFilter = document.getElementById('adv-sort-filter');
  advStartDate = document.getElementById('adv-start-date');
  advEndDate = document.getElementById('adv-end-date');
  resetFiltersBtn = document.getElementById('reset-filters-btn');
  exportCsvBtn = document.getElementById('export-csv-btn');
  filteredStatsText = document.getElementById('filtered-stats-text');
  
  chatFeed = document.getElementById('chat-feed');
  chatForm = document.getElementById('chat-form');
  chatInput = document.getElementById('chat-input');
  
  financialInsightsBox = document.getElementById('financial-insights-box');
  
  calendarCells = document.getElementById('calendar-cells');
  calendarMonthYear = document.getElementById('calendar-month-year');
  calPrevBtn = document.getElementById('cal-prev-btn');
  calNextBtn = document.getElementById('cal-next-btn');
  
  authForm = document.getElementById('auth-form');
  authTitle = document.getElementById('auth-title');
  authSubtitle = document.getElementById('auth-subtitle');
  authSubmitBtn = document.getElementById('auth-submit-btn');
  authToggleLink = document.getElementById('auth-toggle-link');
  authToggleText = document.getElementById('auth-toggle-text');
  authUsernameGroup = document.getElementById('auth-username-group');
  authUsername = document.getElementById('auth-username');
  authEmail = document.getElementById('auth-email');
  authPassword = document.getElementById('auth-password');
  logoutBtn = document.getElementById('logout-btn');
  userDisplayName = document.getElementById('user-display-name');
  userDisplayRole = document.getElementById('user-display-role');
}

let isSignUpMode = false;
let isForgotPasswordMode = false;
let isUpdatePasswordMode = false;

// Initialize Application
function init() {
  makeInitialDataDynamic();
  initializeDOMElements();
  setupTheme();
  setupNavigation();
  setupAuthListeners();
  setupSettingsListeners();
  
  // Set default dates
  const todayString = new Date().toISOString().substring(0, 10);
  if (document.getElementById('expense-date')) document.getElementById('expense-date').value = todayString;
  if (document.getElementById('funding-date')) document.getElementById('funding-date').value = todayString;
  
  // Global search input filters active tab details
  searchInput.addEventListener('input', () => {
    const activeTab = document.querySelector('.tab-view.active').id;
    if (activeTab === 'dashboard-view') {
      renderTransactionsTable();
    } else if (activeTab === 'transactions-view') {
      renderDetailedTransactions();
    }
  });

  // Listeners: Dashboard
  if (categoryFilter) categoryFilter.addEventListener('change', renderTransactionsTable);
  if (reportFilter) reportFilter.addEventListener('change', renderCharts);
  if (addExpenseForm) addExpenseForm.addEventListener('submit', handleAddExpense);
  if (editLimitBtn) editLimitBtn.addEventListener('click', handleEditLimit);
  const editLimitBtnDash = document.getElementById('edit-limit-btn-dash');
  if (editLimitBtnDash) editLimitBtnDash.addEventListener('click', handleEditLimit);
  // Set up currency selector
  updateInputLabels();
  const currencySelect = document.getElementById('currency-select');
  if (currencySelect) {
    currencySelect.value = currentCurrency;
    currencySelect.addEventListener('change', (e) => {
      currentCurrency = e.target.value;
      safeStorage.setItem('office_currency', currentCurrency);
      updateMonthlyLimitFromCurrency();
      updateInputLabels();
      renderAll();
    });
  }

  themeToggleBtn.addEventListener('click', toggleTheme);
  
  // Listeners: Reports Export
  const downloadPdfBtn = document.getElementById('download-pdf-btn');
  if (downloadPdfBtn) downloadPdfBtn.addEventListener('click', downloadPDFReport);

  // Listeners: Payments
  if (addFundingForm) addFundingForm.addEventListener('submit', handleAddFunding);

  // Listeners: Transactions Detailed Page
  if (advCategoryFilter) advCategoryFilter.addEventListener('change', renderDetailedTransactions);
  if (advSortFilter) advSortFilter.addEventListener('change', renderDetailedTransactions);
  if (advStartDate) advStartDate.addEventListener('change', renderDetailedTransactions);
  if (advEndDate) advEndDate.addEventListener('change', renderDetailedTransactions);
  if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', resetDetailedFilters);
  if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportToCSV);

  // Listeners: Chat
  if (chatForm) chatForm.addEventListener('submit', handleSendChat);

  // Listeners: Calendar
  if (calPrevBtn) calPrevBtn.addEventListener('click', () => changeMonth(-1));
  if (calNextBtn) calNextBtn.addEventListener('click', () => changeMonth(1));


  // Set up in-memory temporary demo button
  const demoBtn = document.getElementById('demo-mode-btn');
  if (demoBtn) {
    demoBtn.addEventListener('click', () => {
      try {
        isDemoMode = true;
        
        currentUser = {
          id: 'demo-user-id',
          email: 'demo@approx.com'
        };
        
        currentProfile = {
          username: 'Demo Client',
          role: 'admin',
          avatar_url: ''
        };
        
        // Shift INITIAL_TRANSACTIONS and INITIAL_FUNDING dates to the current month
        makeInitialDataDynamic();
        
        // Load copies into memory
        transactions = JSON.parse(JSON.stringify(INITIAL_TRANSACTIONS)).map((tx, idx) => ({
          id: 'tx-demo-' + idx,
          ...tx
        }));
        
        fundingHistory = JSON.parse(JSON.stringify(INITIAL_FUNDING)).map((f, idx) => ({
          id: 'fund-demo-' + idx,
          ...f
        }));
        
        chats = [
          { sender: 'Support Agent Az', text: 'Hello! Welcome to Approx Live Support Helpdesk. How can I assist you with your office expenses today?', time: '12:00 PM', type: 'incoming' },
          { sender: 'Demo Client', text: 'Hi, I am testing the demo mode of the dashboard.', time: '12:01 PM', type: 'outgoing' },
          { sender: 'Support Agent Az', text: 'Great! You can add/delete expenses, view reports, or test calculations. Everything works in-memory!', time: '12:02 PM', type: 'incoming' }
        ];
        
        // Update display details
        const userDisplayName = document.getElementById('user-display-name');
        const userDisplayRole = document.getElementById('user-display-role');
        if (userDisplayName) userDisplayName.textContent = currentProfile.username;
        if (userDisplayRole) userDisplayRole.textContent = 'Admin';
        
        // Update default currency limits
        updateMonthlyLimitFromCurrency();
        
        // Switch view containers
        const authContainer = document.getElementById('auth-container');
        const appContainer = document.getElementById('app-container');
        if (authContainer) authContainer.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');
        
        // Render components
        renderAll();
      } catch (err) {
        alert("Demo Mode Init Error: " + err.message + "\n\nStack:\n" + err.stack);
      }
    });
  }

  // Check current session immediately
  checkSession();
}

// 4. Tab Navigation Logic
function setupNavigation() {
  const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  
  if (mobileMenuToggle && sidebar) {
    mobileMenuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('open');
    });
    
    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== mobileMenuToggle) {
        sidebar.classList.remove('open');
      }
    });
    
    const mobileMenuClose = document.getElementById('mobile-menu-close');
    if (mobileMenuClose) {
      mobileMenuClose.addEventListener('click', () => {
        sidebar.classList.remove('open');
      });
    }
    
    menuItems.forEach(item => {
      item.addEventListener('click', () => {
        sidebar.classList.remove('open');
      });
    });
  }
  
  menuItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      
      const tabId = item.getAttribute('data-tab');
      if (!tabId) return;
      
      // Update active sidebar item
      menuItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      
      // Update active view
      const tabViews = document.querySelectorAll('.tab-view');
      tabViews.forEach(view => view.classList.remove('active'));
      
      const targetView = document.getElementById(tabId);
      if (targetView) {
        targetView.classList.add('active');
        
        // Update header texts
        const headerInfo = TAB_DESCRIPTIONS[tabId];
        if (headerInfo) {
          pageTitle.textContent = headerInfo.title;
          pageSubtitle.textContent = headerInfo.sub;
        }
        
        // Reset Search Bar
        searchInput.value = '';
        
        // Custom triggers per tab
        if (tabId === 'dashboard-view') {
          renderCharts();
          renderTransactionsTable();
        } else if (tabId === 'transactions-view') {
          renderDetailedTransactions();
        } else if (tabId === 'payments-view') {
          renderPaymentsTable();
        } else if (tabId === 'support-view') {
          renderChats();
          chatFeed.scrollTop = chatFeed.scrollHeight;
        } else if (tabId === 'reports-view') {
          renderReportsTab();
        } else if (tabId === 'calendar-view') {
          renderCalendar();
        }
      }
    });
  });
}

// Auth UI toggles and form submissions
function setupAuthListeners() {
  const togglePasswordBtn = document.getElementById('toggle-password-btn');
  const forgotPasswordLink = document.getElementById('forgot-password-link');
  const authEmailGroup = document.getElementById('auth-email-group');
  const authPasswordGroup = document.getElementById('auth-password-group');
  const authForgotLinkWrapper = document.getElementById('auth-forgot-link-wrapper');

  // Toggle Password Visibility
  if (togglePasswordBtn && authPassword) {
    togglePasswordBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const isPassword = authPassword.type === 'password';
      authPassword.type = isPassword ? 'text' : 'password';
      const icon = togglePasswordBtn.querySelector('i');
      if (icon) {
        icon.className = isPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
      }
    });
  }

  // Helper to update Auth card visual state
  function updateAuthUI() {
    // Reset password input type to password when switching modes
    if (authPassword) authPassword.type = 'password';
    if (togglePasswordBtn) {
      const icon = togglePasswordBtn.querySelector('i');
      if (icon) icon.className = 'fa-regular fa-eye';
    }

    if (isUpdatePasswordMode) {
      authTitle.textContent = 'Update Password';
      authSubtitle.textContent = 'Enter your new password below';
      authSubmitBtn.textContent = 'Update Password';
      if (authUsernameGroup) authUsernameGroup.style.display = 'none';
      if (authEmailGroup) authEmailGroup.style.display = 'none';
      if (authPasswordGroup) authPasswordGroup.style.display = 'block';
      if (authForgotLinkWrapper) authForgotLinkWrapper.style.display = 'none';
      authToggleText.textContent = '';
      authToggleLink.textContent = 'Cancel';
      authUsername.required = false;
      authEmail.required = false;
      authPassword.required = true;
    } else if (isForgotPasswordMode) {
      authTitle.textContent = 'Reset Password';
      authSubtitle.textContent = 'Enter email to receive reset link';
      authSubmitBtn.textContent = 'Send Reset Link';
      if (authUsernameGroup) authUsernameGroup.style.display = 'none';
      if (authEmailGroup) authEmailGroup.style.display = 'block';
      if (authPasswordGroup) authPasswordGroup.style.display = 'none';
      if (authForgotLinkWrapper) authForgotLinkWrapper.style.display = 'none';
      authToggleText.textContent = 'Remembered your password?';
      authToggleLink.textContent = 'Sign In';
      authUsername.required = false;
      authEmail.required = true;
      authPassword.required = false;
    } else if (isSignUpMode) {
      authTitle.textContent = 'Create Account';
      authSubtitle.textContent = 'Register to start tracking office expenses';
      authSubmitBtn.textContent = 'Sign Up';
      authToggleText.textContent = 'Already have an account?';
      authToggleLink.textContent = 'Sign In';
      if (authUsernameGroup) authUsernameGroup.style.display = 'block';
      if (authEmailGroup) authEmailGroup.style.display = 'block';
      if (authPasswordGroup) authPasswordGroup.style.display = 'block';
      if (authForgotLinkWrapper) authForgotLinkWrapper.style.display = 'none';
      authUsername.required = true;
      authEmail.required = true;
      authPassword.required = true;
    } else {
      // Sign In mode (default)
      authTitle.textContent = 'Welcome Back';
      authSubtitle.textContent = 'Sign in to manage your office expenses';
      authSubmitBtn.textContent = 'Sign In';
      authToggleText.textContent = "Don't have an account?";
      authToggleLink.textContent = 'Sign Up';
      if (authUsernameGroup) authUsernameGroup.style.display = 'none';
      if (authEmailGroup) authEmailGroup.style.display = 'block';
      if (authPasswordGroup) authPasswordGroup.style.display = 'block';
      if (authForgotLinkWrapper) authForgotLinkWrapper.style.display = 'block';
      authUsername.required = false;
      authEmail.required = true;
      authPassword.required = true;
    }
  }

  // Toggle SignUp Mode
  if (authToggleLink) {
    authToggleLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (isUpdatePasswordMode) {
        // Cancel update password
        isUpdatePasswordMode = false;
        window.location.hash = '';
        updateAuthUI();
      } else if (isForgotPasswordMode) {
        isForgotPasswordMode = false;
        isSignUpMode = false;
        updateAuthUI();
      } else {
        isSignUpMode = !isSignUpMode;
        updateAuthUI();
      }
    });
  }

  // Trigger Forgot Password mode
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      isForgotPasswordMode = true;
      isSignUpMode = false;
      isUpdatePasswordMode = false;
      updateAuthUI();
    });
  }

  // Expose switcher for recovery token detection
  window.triggerUpdatePasswordMode = () => {
    isUpdatePasswordMode = true;
    isForgotPasswordMode = false;
    isSignUpMode = false;
    updateAuthUI();
  };

  // Auth Form Submit Handler
  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = authEmail.value.trim();
      const password = authPassword.value;
      const username = authUsername.value.trim();
      
      authSubmitBtn.disabled = true;
      
      if (isForgotPasswordMode) {
        authSubmitBtn.textContent = 'Sending Link...';
      } else if (isUpdatePasswordMode) {
        authSubmitBtn.textContent = 'Updating...';
      } else {
        authSubmitBtn.textContent = isSignUpMode ? 'Signing Up...' : 'Signing In...';
      }
      
      try {
        if (isUpdatePasswordMode) {
          const { error } = await supabase.auth.updateUser({ password: password });
          if (error) throw error;
          alert('Password updated successfully! You can now sign in.');
          isUpdatePasswordMode = false;
          window.location.hash = '';
          updateAuthUI();
        } else if (isForgotPasswordMode) {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + window.location.pathname
          });
          if (error) throw error;
          alert('Password reset link sent to your email address! Please check your inbox.');
          isForgotPasswordMode = false;
          updateAuthUI();
        } else if (isSignUpMode) {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: window.location.origin + window.location.pathname,
              data: {
                username: username || email.split('@')[0],
                role: 'employee'
              }
            }
          });
          if (error) throw error;
          alert('Registration successful! If required, please confirm your email, otherwise try logging in.');
          isSignUpMode = false;
          updateAuthUI();
        } else {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
        }
      } catch (err) {
        alert(err.message || 'Authentication error');
      } finally {
        authSubmitBtn.disabled = false;
        if (isForgotPasswordMode) {
          authSubmitBtn.textContent = 'Send Reset Link';
        } else if (isUpdatePasswordMode) {
          authSubmitBtn.textContent = 'Update Password';
        } else {
          authSubmitBtn.textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
        }
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to log out?')) {
        if (isDemoMode) {
          isDemoMode = false;
          window.location.reload();
        } else {
          await supabase.auth.signOut();
        }
      }
    });
  }
}

// Session checker and listener
async function checkSession() {
  // Check if we have a recovery token in the URL hash
  if (window.location.hash && window.location.hash.includes('type=recovery')) {
    if (window.triggerUpdatePasswordMode) {
      window.triggerUpdatePasswordMode();
    }
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    handleAuthState(session);

    supabase.auth.onAuthStateChange((event, session) => {
      handleAuthState(session);
    });
  } catch (e) {
    console.error("Auth check failed:", e.message);
  }
}

async function handleAuthState(session) {
  try {
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');

    if (session) {
      currentUser = session.user;

      // Fetch user profile info
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        currentProfile = {
          username: profile?.username || currentUser.user_metadata?.username || currentUser.email.split('@')[0],
          role: profile?.role || currentUser.user_metadata?.role || 'employee',
          avatar_url: safeStorage.getItem(`office_avatar_${currentUser.id}`) || currentUser.user_metadata?.avatar_url || ''
        };
      } catch (e) {
        console.error("Profile load error:", e.message);
        currentProfile = {
          username: currentUser.email.split('@')[0],
          role: 'employee',
          avatar_url: safeStorage.getItem(`office_avatar_${currentUser.id}`) || currentUser.user_metadata?.avatar_url || ''
        };
      }

      // Load custom categories for this user!
      loadCategories();
      // Load custom limits for the currency!
      updateMonthlyLimitFromCurrency();

      if (userDisplayName) userDisplayName.textContent = currentProfile.username;
      if (userDisplayRole) {
        const displayRole = currentProfile.role === 'personal' || currentProfile.role === 'employee'
          ? 'Personal' 
          : currentProfile.role.toUpperCase();
        userDisplayRole.textContent = displayRole;
      }
      
      // Update profile images dynamically
      updateAvatarDisplay(currentProfile.avatar_url);

      // Toggle views
      if (authContainer) authContainer.classList.add('hidden');
      if (appContainer) appContainer.classList.remove('hidden');

      // Sync database data
      await checkAndSeedDatabase();
      await loadDatabaseData();
      subscribeChats();
    } else {
      currentUser = null;
      currentProfile = null;
      safeStorage.removeItem('demo_session_active');

      if (chatSubscription) {
        supabase.removeChannel(chatSubscription);
        chatSubscription = null;
      }

      if (authContainer) authContainer.classList.remove('hidden');
      if (appContainer) appContainer.classList.add('hidden');
    }
  } catch (err) {
    alert("handleAuthState Error: " + err.message + "\nStack: " + err.stack);
  }
}

// Database Seeder
async function checkAndSeedDatabase() {
  try {
    const { data, error, count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });
      
    if (error) throw error;

    if (count === 0) {
      console.log("Seeding database with default office data...");
      
      // Seed transactions
      const txs = INITIAL_TRANSACTIONS.map(tx => ({
        date: tx.date,
        item: tx.item,
        category: tx.category,
        amount: tx.amount,
        user_id: currentUser.id
      }));
      await supabase.from('transactions').insert(txs);

      // Seed funding
      const funds = INITIAL_FUNDING.map(f => ({
        source: f.source,
        date: f.date,
        amount: f.amount,
        user_id: currentUser.id
      }));
      await supabase.from('funding').insert(funds);

      // Seed mock chat messages
      const chatsToSeed = [
        { sender_name: 'Support Agent Az', text: 'Hello! Welcome to Approx Live Support Helpdesk. How can I assist you with your office expenses today?' },
        { sender_name: 'User', text: 'Hi, I had a question about setting currency-specific limits.' },
        { sender_name: 'Support Agent Az', text: 'Sure! You can switch currencies in the header and then click "Edit Limit" on the bottom left. Each currency budget is saved independently.' },
        { sender_name: 'User', text: 'Great, that works perfectly. Thank you!' }
      ];
      await supabase.from('chats').insert(chatsToSeed);
    }
  } catch (err) {
    console.error("Database seeding skipped or failed: ", err.message);
  }
}

// Async Data Fetching
async function loadDatabaseData() {
  if (!currentUser) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      currentUser = session.user;
    } else {
      return;
    }
  }

  try {
    // 1. Fetch transactions
    const { data: txs, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('date', { ascending: false });
    if (txError) throw txError;
    transactions = txs || [];

    // 2. Fetch funding
    const { data: fund, error: fundError } = await supabase
      .from('funding')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('date', { ascending: false });
    if (fundError) throw fundError;
    fundingHistory = fund || [];

    // 3. Fetch chats (last 50 messages)
    const { data: chatMsgs, error: chatError } = await supabase
      .from('chats')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(50);
    if (chatError) throw chatError;
    
    chats = (chatMsgs || []).map(msg => ({
      sender: msg.sender_name,
      text: msg.text,
      time: new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      type: msg.sender_name === currentProfile.username ? 'outgoing' : 'incoming'
    }));

    renderAll();
  } catch (err) {
    console.error('Error fetching data from database:', err.message);
  }
}

// Real-time Chat Subscription
function subscribeChats() {
  if (chatSubscription) {
    supabase.removeChannel(chatSubscription);
  }
  
  chatSubscription = supabase
    .channel('public:chats')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chats' }, payload => {
      const newMsg = payload.new;
      
      // Prevent double rendering of optimistically added chats
      const isDuplicate = chats.some(c => c.text === newMsg.text && c.sender === newMsg.sender_name);
      if (isDuplicate) return;
      
      const mapped = {
        sender: newMsg.sender_name,
        text: newMsg.text,
        time: new Date(newMsg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        type: (currentProfile && newMsg.sender_name === currentProfile.username) ? 'outgoing' : 'incoming'
      };
      
      chats.push(mapped);
      renderChats();
      
      const activeTab = document.querySelector('.tab-view.active')?.id;
      if (activeTab === 'support-view') {
        chatFeed.scrollTop = chatFeed.scrollHeight;
      }
    })
    .subscribe();
}

// Calculations
function calculateTotals() {
  const totalSpent = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);
  const totalReceived = fundingHistory.reduce((sum, pay) => sum + parseFloat(pay.amount || 0), 0);
  const remaining = monthlyLimit - totalSpent;
  const balance = totalReceived - totalSpent;
  
  return {
    totalSpent,
    totalReceived,
    remaining,
    balance
  };
}

// Global currency state
let currentCurrency = safeStorage.getItem('office_currency') || 'PKR';

const EXCHANGE_RATES = {
  PKR: 1,
  USD: 280,
  GBP: 360
};

// Convert value from PKR (base) to current selected currency
function fromBaseCurrency(valPKR) {
  const rate = EXCHANGE_RATES[currentCurrency] || 1;
  return valPKR / rate;
}

// Convert value from current selected currency to PKR (base)
function toBaseCurrency(valCurrent) {
  const rate = EXCHANGE_RATES[currentCurrency] || 1;
  return valCurrent * rate;
}

const DEFAULT_LIMITS = {
  PKR: 28000,
  USD: 100,
  GBP: 80
};

function updateMonthlyLimitFromCurrency() {
  const userId = currentUser ? currentUser.id : 'default';
  const key = `office_limit_${currentCurrency}_${userId}`;
  let savedLimit = safeStorage.getItem(key);
  
  if (!savedLimit) {
    savedLimit = DEFAULT_LIMITS[currentCurrency] || 100;
    safeStorage.setItem(key, savedLimit.toString());
  }
  
  monthlyLimit = toBaseCurrency(parseFloat(savedLimit));
}

function formatCurrency(valPKR) {
  const converted = fromBaseCurrency(valPKR);
  
  if (currentCurrency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(converted);
  } else if (currentCurrency === 'GBP') {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(converted);
  } else {
    // Default PKR
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(converted);
  }
}

function formatPKR(val) {
  return formatCurrency(val);
}

function updateInputLabels() {
  const expenseAmountLabel = document.querySelector('label[for="expense-amount"]');
  const fundingAmountLabel = document.querySelector('label[for="funding-amount"]');
  const symbol = currentCurrency === 'USD' ? '$' : currentCurrency === 'GBP' ? '£' : 'PKR';
  
  if (expenseAmountLabel) expenseAmountLabel.textContent = `Amount (${symbol})`;
  if (fundingAmountLabel) fundingAmountLabel.textContent = `Amount (${symbol})`;
}

// Render All Components
function renderAll() {
  renderMetrics();
  renderTransactionsTable();
  renderCategoryList();
  renderCharts();
  renderPaymentsTable();
  renderDetailedTransactions();
  renderChats();
  renderReportsTab();
  renderCalendar();
}

// 5. Render Shared Metrics
function renderMetrics() {
  const stats = calculateTotals();
  
  metricReceived.textContent = formatPKR(stats.totalReceived);
  metricSpent.textContent = formatPKR(stats.totalSpent);
  
  const spentPct = ((stats.totalSpent / monthlyLimit) * 100).toFixed(1);
  metricSpentSub.innerHTML = `<span><strong>${spentPct}%</strong> of monthly limit</span>`;
  
  metricRemaining.textContent = formatPKR(stats.remaining);
  if (stats.remaining < 0) {
    metricRemaining.style.color = '#ef4444';
    metricRemainingSub.innerHTML = `<span class="down"><i class="fa-solid fa-triangle-exclamation"></i> Over budget by ${formatPKR(Math.abs(stats.remaining))}</span>`;
  } else {
    metricRemaining.style.color = '';
    metricRemainingSub.innerHTML = `<span>Available budget left</span>`;
  }
  
  metricBalance.textContent = formatPKR(stats.balance);
  if (stats.balance < 0) {
    metricBalance.style.color = '#ef4444';
    metricBalanceSub.innerHTML = `<span class="down"><i class="fa-solid fa-arrow-trend-down"></i> Spent out of pocket</span>`;
  } else {
    metricBalance.style.color = '#10b981';
    metricBalanceSub.innerHTML = `<span class="up"><i class="fa-solid fa-arrow-trend-up"></i> Within received cash</span>`;
  }
  
  // Sidebar limit info
  const sideLimitLabel = document.querySelector('.sidebar-footer p');
  if (sideLimitLabel) sideLimitLabel.textContent = `Limit: ${formatPKR(monthlyLimit)} | Rec: ${formatPKR(stats.totalReceived)}`;
}

// 6. Dashboard Recent Transactions Table
function renderTransactionsTable() {
  const query = searchInput.value.toLowerCase().trim();
  const catFilter = categoryFilter.value;
  
  const filtered = transactions.filter(tx => {
    const matchesSearch = tx.item.toLowerCase().includes(query) || tx.date.includes(query);
    const matchesCategory = catFilter === 'all' || tx.category === catFilter;
    return matchesSearch && matchesCategory;
  });
  
  // Show last 5 recent transactions on dashboard
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent = filtered.slice(0, 5);
  
  transactionRows.innerHTML = '';
  
  if (recent.length === 0) {
    transactionRows.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 30px;">
          No transactions registered.
        </td>
      </tr>
    `;
    return;
  }
  
  recent.forEach(tx => {
    const row = document.createElement('tr');
    const formattedDate = new Date(tx.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
    
    row.innerHTML = `
      <td>
        <div style="font-weight: 700;" class="item-badge">${tx.item}</div>
        <div style="font-size: 10px; color: var(--text-secondary);">ID: ${(tx.id || '').substring(0, 8)}...</div>
      </td>
      <td>
        <span class="category-badge ${tx.category}">
          ${CATEGORY_META[tx.category]?.name.split(' ')[0] || tx.category}
        </span>
      </td>
      <td style="font-size: 13px; color: var(--text-secondary);">${formattedDate}</td>
      <td>
        <span class="amount-val">${formatPKR(tx.amount)}</span>
      </td>
      <td>
        <button class="action-btn delete-tx-btn" data-id="${tx.id}" title="Delete record">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </td>
    `;
    transactionRows.appendChild(row);
  });

  // Attach delete listeners dynamically
  document.querySelectorAll('.delete-tx-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteTransaction(btn.getAttribute('data-id')));
  });
}

// Global Delete Action
async function deleteTransaction(id) {
  if (confirm("Are you sure you want to delete this expense record?")) {
    if (isDemoMode) {
      transactions = transactions.filter(tx => tx.id !== id);
      renderAll();
      return;
    }
    
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      await loadDatabaseData();
    } catch (err) {
      alert("Error deleting expense: " + err.message);
    }
  }
}
window.deleteTransaction = deleteTransaction;

// 7. Category List summary
function renderCategoryList() {
  const totals = calculateTotals();
  const catSums = {};
  Object.keys(CATEGORY_META).forEach(k => catSums[k] = 0);
  
  transactions.forEach(tx => {
    const cat = tx.category || 'other';
    if (catSums[cat] !== undefined) catSums[cat] += parseFloat(tx.amount);
    else catSums['other'] += parseFloat(tx.amount);
  });
  
  categoryListContainer.innerHTML = '';
  
  const sorted = Object.entries(catSums).sort((a,b) => b[1]-a[1]);
  
  sorted.forEach(([cat, amount]) => {
    const meta = CATEGORY_META[cat];
    const pct = totals.totalSpent > 0 ? ((amount / totals.totalSpent) * 100).toFixed(1) : 0;
    
    const item = document.createElement('div');
    item.className = 'category-item';
    item.innerHTML = `
      <div class="category-info">
        <div class="category-color" style="background-color: ${meta.color};"></div>
        <div>
          <div class="category-name">${meta.name.split(' ')[0]}</div>
          <div style="font-size: 10px; color: var(--text-secondary);">${pct}% of spent</div>
        </div>
      </div>
      <div class="category-val">${formatPKR(amount)}</div>
    `;
    categoryListContainer.appendChild(item);
  });
}

// 8. Render Charts
function renderCharts() {
  // Line / Bar Chart (Daily expenses)
  const ctx = document.getElementById('expenseReportChart')?.getContext('2d');
  if (ctx) {
    const dailyTotals = {};
    transactions.forEach(tx => {
      dailyTotals[tx.date] = (dailyTotals[tx.date] || 0) + parseFloat(tx.amount);
    });
    
    let sortedDates = Object.keys(dailyTotals).sort((a, b) => new Date(a) - new Date(b));
    if (reportFilter && reportFilter.value === 'last-7') {
      sortedDates = sortedDates.slice(-7);
    }
    
    const labels = sortedDates.map(d => {
      const parts = d.split('-');
      return `${parts[2]}/${parts[1]}`;
    });
    const data = sortedDates.map(d => dailyTotals[d]);
    
    if (reportChartInstance) reportChartInstance.destroy();
    
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? '#1e293b' : '#f1f5f9';
    const labelColor = isDark ? '#94a3b8' : '#64748b';
    
    reportChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: '#10b981',
          borderRadius: 6,
          barThickness: 12
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: labelColor } },
          y: { grid: { color: gridColor }, ticks: { color: labelColor } }
        }
      }
    });
  }

  // Budget spent gauge
  const gaugeCtx = document.getElementById('budgetSpentChart')?.getContext('2d');
  if (gaugeCtx) {
    const stats = calculateTotals();
    const spentPct = Math.min(((stats.totalSpent / monthlyLimit) * 100), 100);
    const remainPct = 100 - spentPct;
    
    budgetPctText.textContent = `${((stats.totalSpent / monthlyLimit) * 100).toFixed(0)}%`;
    
    if (stats.totalSpent > monthlyLimit) {
      budgetAlertMsg.textContent = `Warning: Limit exceeded by ${formatPKR(stats.totalSpent - monthlyLimit)}!`;
      budgetAlertMsg.style.background = 'rgba(239, 68, 68, 0.08)';
      budgetAlertMsg.style.borderColor = 'rgba(239, 68, 68, 0.2)';
      budgetAlertMsg.style.color = '#ef4444';
    } else if (spentPct > 80) {
      budgetAlertMsg.textContent = `Alert: Used ${spentPct.toFixed(0)}% of limit!`;
      budgetAlertMsg.style.background = 'rgba(245, 158, 11, 0.08)';
      budgetAlertMsg.style.borderColor = 'rgba(245, 158, 11, 0.2)';
      budgetAlertMsg.style.color = '#f59e0b';
    } else {
      budgetAlertMsg.textContent = `Remaining limit: ${formatPKR(monthlyLimit - stats.totalSpent)}.`;
      budgetAlertMsg.style.background = '';
      budgetAlertMsg.style.borderColor = '';
      budgetAlertMsg.style.color = '';
    }
    
    if (gaugeChartInstance) gaugeChartInstance.destroy();
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const remainColor = isDark ? '#1e293b' : '#f1f5f9';
    const fillColor = stats.totalSpent > monthlyLimit ? '#ef4444' : '#6366f1';
    
    gaugeChartInstance = new Chart(gaugeCtx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [spentPct, remainPct],
          backgroundColor: [fillColor, remainColor],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '80%',
        rotation: -90,
        circumference: 180,
        plugins: { legend: { display: false }, tooltip: { enabled: false } }
      }
    });
  }
}

// 9. Payments View: Funding history
function renderPaymentsTable() {
  if (!paymentRows) return;
  
  paymentRows.innerHTML = '';
  
  // Sort by date descending
  const sortedFunding = [...fundingHistory].sort((a,b) => new Date(b.date) - new Date(a.date));
  
  sortedFunding.forEach(pay => {
    const row = document.createElement('tr');
    const formattedDate = new Date(pay.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    row.innerHTML = `
      <td>
        <div style="font-weight: 700;">${pay.source}</div>
        <div style="font-size: 10px; color: var(--text-secondary);">ID: ${(pay.id || '').substring(0, 8)}...</div>
      </td>
      <td style="color: var(--text-secondary);">${formattedDate}</td>
      <td>
        <span class="amount-val" style="color: var(--success);">+${formatPKR(pay.amount)}</span>
      </td>
      <td>
        <button class="action-btn delete-funding-btn" data-id="${pay.id}" title="Delete record">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </td>
    `;
    paymentRows.appendChild(row);
  });

  // Attach delete listener dynamically
  document.querySelectorAll('.delete-funding-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteFunding(btn.getAttribute('data-id')));
  });
}

// Add Funding
async function handleAddFunding(e) {
  e.preventDefault();
  
  if (!currentUser) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      currentUser = session.user;
    } else {
      alert("Error: No active user session found. Please sign in again.");
      window.location.reload();
      return;
    }
  }
  
  const sourceInput = document.getElementById('funding-source');
  const amountInput = document.getElementById('funding-amount');
  const dateInput = document.getElementById('funding-date');

  const source = sourceInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const date = dateInput.value;
  
  if (!source || isNaN(amount) || amount <= 0 || !date) return;

  if (isDemoMode) {
    const newFunding = {
      id: 'fund-demo-' + Date.now(),
      source,
      date,
      amount: toBaseCurrency(amount)
    };
    fundingHistory.unshift(newFunding);
    sourceInput.value = '';
    amountInput.value = '';
    renderAll();
    return;
  }

  try {
    const { error } = await supabase
      .from('funding')
      .insert({
        source,
        date,
        amount: toBaseCurrency(amount),
        user_id: currentUser.id
      });
      
    if (error) throw error;
    
    sourceInput.value = '';
    amountInput.value = '';
    
    await loadDatabaseData();
  } catch (err) {
    alert("Error adding funding: " + err.message);
  }
}

async function deleteFunding(id) {
  if (confirm("Are you sure you want to delete this funding deposit record?")) {
    if (isDemoMode) {
      fundingHistory = fundingHistory.filter(f => f.id !== id);
      renderAll();
      return;
    }
    
    try {
      const { error } = await supabase
        .from('funding')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      await loadDatabaseData();
    } catch (err) {
      alert("Error deleting funding record: " + err.message);
    }
  }
}
window.deleteFunding = deleteFunding;

// 10. Transactions View: Detailed List Page
function renderDetailedTransactions() {
  if (!detailedTransactionRows) return;
  
  const query = searchInput.value.toLowerCase().trim();
  const cat = advCategoryFilter.value;
  const sort = advSortFilter.value;
  const start = advStartDate.value;
  const end = advEndDate.value;
  
  let filtered = transactions.filter(tx => {
    const matchesSearch = tx.item.toLowerCase().includes(query) || tx.id.includes(query);
    const matchesCat = cat === 'all' || tx.category === cat;
    
    let matchesDate = true;
    if (start) matchesDate = matchesDate && new Date(tx.date) >= new Date(start);
    if (end) matchesDate = matchesDate && new Date(tx.date) <= new Date(end);
    
    return matchesSearch && matchesCat && matchesDate;
  });
  
  // Sorting
  if (sort === 'date-desc') filtered.sort((a,b) => new Date(b.date) - new Date(a.date));
  else if (sort === 'date-asc') filtered.sort((a,b) => new Date(a.date) - new Date(b.date));
  else if (sort === 'amount-desc') filtered.sort((a,b) => parseFloat(b.amount) - parseFloat(a.amount));
  else if (sort === 'amount-asc') filtered.sort((a,b) => parseFloat(a.amount) - parseFloat(b.amount));
  
  // Filter stats text
  const totalAmount = filtered.reduce((s, tx) => s + parseFloat(tx.amount), 0);
  filteredStatsText.innerHTML = `Showing <strong>${filtered.length}</strong> transactions | Total spent: <strong>${formatPKR(totalAmount)}</strong>`;
  
  detailedTransactionRows.innerHTML = '';
  
  if (filtered.length === 0) {
    detailedTransactionRows.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 40px;">
          No matching transactions found.
        </td>
      </tr>
    `;
    return;
  }
  
  filtered.forEach(tx => {
    const row = document.createElement('tr');
    const formattedDate = new Date(tx.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    row.innerHTML = `
      <td style="font-family: monospace; font-size: 12px; color: var(--text-secondary);">${(tx.id || '').substring(0, 8)}...</td>
      <td style="font-weight: 700; text-transform: capitalize;">${tx.item}</td>
      <td>
        <span class="category-badge ${tx.category}">
          ${CATEGORY_META[tx.category]?.name || tx.category}
        </span>
      </td>
      <td>${formattedDate}</td>
      <td>
        <span class="amount-val">${formatPKR(tx.amount)}</span>
      </td>
      <td>
        <button class="action-btn delete-tx-detailed-btn" data-id="${tx.id}" title="Delete record">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </td>
    `;
    detailedTransactionRows.appendChild(row);
  });

  // Attach listeners
  document.querySelectorAll('.delete-tx-detailed-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteTransaction(btn.getAttribute('data-id')));
  });
}

function resetDetailedFilters() {
  advCategoryFilter.value = 'all';
  advSortFilter.value = 'date-desc';
  advStartDate.value = '';
  advEndDate.value = '';
  searchInput.value = '';
  renderDetailedTransactions();
}

function exportToCSV() {
  let csvContent = "data:text/csv;charset=utf-8,ID,Item Description,Category,Date,Amount (PKR)\n";
  
  transactions.forEach(tx => {
    csvContent += `"${tx.id}","${tx.item}","${CATEGORY_META[tx.category]?.name || tx.category}","${tx.date}",${tx.amount}\n`;
  });
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `office_expenses_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function downloadPDFReport() {
  const downloadBtn = document.getElementById('download-pdf-btn');
  if (downloadBtn) {
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Generating PDF...';
  }

  try {
    const stats = calculateTotals();
    const today = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' });
    
    // 1. Generate category breakdown rows
    const catSums = {};
    Object.keys(CATEGORY_META).forEach(k => catSums[k] = 0);
    transactions.forEach(tx => {
      const cat = tx.category || 'other';
      if (catSums[cat] !== undefined) catSums[cat] += parseFloat(tx.amount);
      else catSums['other'] += parseFloat(tx.amount);
    });
    
    let catRowsHtml = '';
    Object.keys(catSums).forEach(k => {
      if (catSums[k] > 0) {
        const pct = ((catSums[k] / (monthlyLimit || 1)) * 100).toFixed(0);
        catRowsHtml += `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${CATEGORY_META[k].name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatPKR(catSums[k])}</td>
            <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #64748b;">${pct}% of Limit</td>
          </tr>
        `;
      }
    });
    
    // 2. Generate transactions table rows
    let txRowsHtml = '';
    const sortedTxs = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date));
    sortedTxs.forEach(tx => {
      const d = new Date(tx.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
      txRowsHtml += `
        <tr>
          <td style="padding: 8px 10px; border-bottom: 1px solid #f1f5f9; font-size: 11px; font-family: monospace; color: #64748b;">${(tx.id || '').substring(0, 8)}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #f1f5f9; font-weight: 500;">${tx.item}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #f1f5f9; text-transform: capitalize;"><span style="padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background-color: #f1f5f9; color: #475569;">${CATEGORY_META[tx.category]?.name.split(' ')[0] || tx.category}</span></td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #f1f5f9; font-size: 11px; color: #64748b;">${d}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 600; color: #0f172a;">${formatPKR(tx.amount)}</td>
        </tr>
      `;
    });
    
    if (txRowsHtml === '') {
      txRowsHtml = `<tr><td colspan="5" style="padding: 30px; text-align: center; color: #64748b;">No transactions registered.</td></tr>`;
    }

    // 3. Create print report template wrapper
    const reportEl = document.createElement('div');
    reportEl.style.padding = '40px';
    reportEl.style.fontFamily = "'Plus Jakarta Sans', sans-serif";
    reportEl.style.color = '#0f172a';
    reportEl.style.backgroundColor = '#ffffff';
    
    reportEl.innerHTML = `
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px;">
        <div>
          <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #6366f1;">Approx Expense</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px; color: #64748b; font-weight: 500;">Personal Expense & Budget Statement</p>
        </div>
        <div style="text-align: right;">
          <span style="font-weight: 700; color: #6366f1; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; padding: 4px 10px; background-color: #f5f3ff; border-radius: 6px;">Report Statement</span>
          <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b;">Generated: <strong>${today}</strong></p>
          <p style="margin: 3px 0 0 0; font-size: 12px; color: #64748b;">Account Holder: <strong>${currentProfile.username}</strong></p>
        </div>
      </div>
      
      <!-- Summary Metrics -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 35px;">
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; text-align: center;">
          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Total Received</span>
          <div style="font-size: 18px; font-weight: 800; color: #10b981; margin-top: 5px;">${formatPKR(stats.totalReceived)}</div>
        </div>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; text-align: center;">
          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Total Expenses</span>
          <div style="font-size: 18px; font-weight: 800; color: #ef4444; margin-top: 5px;">${formatPKR(stats.totalSpent)}</div>
        </div>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; text-align: center;">
          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Remaining Limit</span>
          <div style="font-size: 18px; font-weight: 800; color: ${stats.remaining < 0 ? '#ef4444' : '#f59e0b'}; margin-top: 5px;">${formatPKR(stats.remaining)}</div>
        </div>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; text-align: center;">
          <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Net Balance</span>
          <div style="font-size: 18px; font-weight: 800; color: #6366f1; margin-top: 5px;">${formatPKR(stats.balance)}</div>
        </div>
      </div>

      <!-- Category Breakdown Table -->
      <div style="margin-bottom: 35px;">
        <h3 style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 12px; border-left: 4px solid #6366f1; padding-left: 8px;">Category Summary</h3>
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
          <thead>
            <tr style="background-color: #f8fafc;">
              <th style="padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 700; color: #475569;">Category</th>
              <th style="padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 700; color: #475569; text-align: right;">Amount Spent</th>
              <th style="padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 700; color: #475569; text-align: right;">Budget Usage</th>
            </tr>
          </thead>
          <tbody>
            ${catRowsHtml || '<tr><td colspan="3" style="padding: 15px; text-align: center; color: #64748b;">No expenses recorded yet.</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- Detailed Ledger Table -->
      <div>
        <h3 style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 12px; border-left: 4px solid #6366f1; padding-left: 8px;">Detailed Ledger Statement</h3>
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 12px;">
          <thead>
            <tr style="background-color: #f8fafc; color: #475569;">
              <th style="padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 700;">TXID</th>
              <th style="padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 700;">Description</th>
              <th style="padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 700;">Category</th>
              <th style="padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 700;">Date</th>
              <th style="padding: 10px; border-bottom: 2px solid #e2e8f0; font-weight: 700; text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${txRowsHtml}
          </tbody>
        </table>
      </div>
      
      <!-- Footer -->
      <div style="margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; font-size: 11px; color: #94a3b8;">
        Generated securely via Approx Expense client. All records are subject to local audit policies.
      </div>
    `;

    // 4. Trigger PDF Download using html2pdf
    const opt = {
      margin:       [0.4, 0.4, 0.4, 0.4],
      filename:     `Expense_Report_${today.replace(/ /g, '_')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // Generate and download
    await html2pdf().set(opt).from(reportEl).save();
  } catch (err) {
    alert("Failed to export PDF: " + err.message);
  } finally {
    if (downloadBtn) {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Download PDF Report';
    }
  }
}

// 11. Chat View logic
function renderChats() {
  if (!chatFeed) return;
  chatFeed.innerHTML = '';
  
  chats.forEach(msg => {
    const bubble = document.createElement('div');
    const isOwn = msg.sender === currentProfile.username;
    bubble.className = `chat-bubble ${isOwn ? 'outgoing' : 'incoming'}`;
    bubble.innerHTML = `
      <span class="chat-sender">${msg.sender}</span>
      <div>${msg.text}</div>
      <span class="chat-meta">${msg.time}</span>
    `;
    chatFeed.appendChild(bubble);
  });
}

async function handleSendChat(e) {
  e.preventDefault();
  const txt = chatInput.value.trim();
  if (!txt) return;
  
  // Clear input instantly for snappy feedback
  chatInput.value = '';
  
  const senderName = (currentProfile && currentProfile.username) 
    ? currentProfile.username 
    : (currentUser && currentUser.email ? currentUser.email.split('@')[0] : 'User');
  
  // Optimistically add to UI list immediately
  chats.push({
    sender: senderName,
    text: txt,
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    type: 'outgoing'
  });
  renderChats();
  if (chatFeed) chatFeed.scrollTop = chatFeed.scrollHeight;
  
  if (isDemoMode) {
    triggerSupportAutoReply();
    return;
  }

  try {
    const { error } = await supabase
      .from('chats')
      .insert({
        sender_name: senderName,
        text: txt
      });
      
    if (error) throw error;
    
    // Auto trigger support agent reply in real mode
    triggerSupportAutoReply();
  } catch (err) {
    console.error("Supabase chat save error:", err.message);
  }
}

function triggerSupportAutoReply() {
  setTimeout(async () => {
    try {
      const supportReplies = [
        "Hi! Welcome to Approx Live Support Helpdesk. Your support ticket has been opened and we will assist you shortly.",
        "Thank you for contacting support! An agent has been assigned to your ticket and will reply shortly.",
        "Your office expense support request has been queued. Average wait time is currently 2 minutes.",
        "Please provide the transaction ID or details if you are reporting a specific transaction issue."
      ];
      const randomReply = supportReplies[Math.floor(Math.random() * supportReplies.length)];
      
      if (isDemoMode) {
        chats.push({
          sender: 'Support Agent Az',
          text: randomReply,
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          type: 'incoming'
        });
        renderChats();
        if (chatFeed) chatFeed.scrollTop = chatFeed.scrollHeight;
        return;
      }
      
      await supabase
        .from('chats')
        .insert({
          sender_name: 'Support Agent Az',
          text: randomReply
        });
    } catch (e) {
      console.error("Support bot auto reply error:", e);
    }
  }, 2000);
}

// 12. Reports View logic
function renderReportsTab() {
  const pieCtx = document.getElementById('detailedCategoryPieChart')?.getContext('2d');
  if (!pieCtx) return;
  
  const totals = calculateTotals();
  const catSums = {};
  Object.keys(CATEGORY_META).forEach(k => catSums[k] = 0);
  
  transactions.forEach(tx => {
    const cat = tx.category || 'other';
    if (catSums[cat] !== undefined) catSums[cat] += parseFloat(tx.amount);
    else catSums['other'] += parseFloat(tx.amount);
  });
  
  const labels = Object.keys(catSums).map(k => CATEGORY_META[k].name.split(' ')[0]);
  const data = Object.values(catSums);
  const colors = Object.keys(catSums).map(k => CATEGORY_META[k].color);
  
  if (reportsPieChartInstance) reportsPieChartInstance.destroy();
  
  reportsPieChartInstance = new Chart(pieCtx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#131926' : '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { family: 'Plus Jakarta Sans', size: 11 },
            color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#f1f5f9' : '#0f172a'
          }
        }
      }
    }
  });

  // Insights
  const highestCat = Object.entries(catSums).sort((a,b) => b[1] - a[1])[0];
  const spentPct = totals.totalSpent > 0 ? ((highestCat[1] / totals.totalSpent) * 100).toFixed(1) : 0;
  
  financialInsightsBox.innerHTML = `
    <div class="insight-card">
      <i class="fa-solid fa-triangle-exclamation insight-icon" style="color: var(--warning);"></i>
      <div>
        <div class="insight-title">Highest Spending Category</div>
        <div class="insight-desc">
          <strong>${CATEGORY_META[highestCat[0]]?.name || highestCat[0]}</strong> is your top expenditure at <strong>${formatPKR(highestCat[1])}</strong>, accounting for <strong>${spentPct}%</strong> of total monthly expenses.
        </div>
      </div>
    </div>
    
    <div class="insight-card">
      <i class="fa-solid fa-chart-line insight-icon" style="color: var(--primary-color);"></i>
      <div>
        <div class="insight-title">Funding Deficit</div>
        <div class="insight-desc">
          You have spent <strong>${formatPKR(totals.totalSpent)}</strong> against a received funding of <strong>${formatPKR(totals.totalReceived)}</strong>. 
          ${totals.balance < 0 ? `Your out-of-pocket deficit is <strong style="color: var(--danger);">${formatPKR(Math.abs(totals.balance))}</strong>.` : `You are within received cash limit with <strong>${formatPKR(totals.balance)}</strong> remaining.`}
        </div>
      </div>
    </div>
    
    <div class="insight-card">
      <i class="fa-solid fa-wallet insight-icon" style="color: var(--success);"></i>
      <div>
        <div class="insight-title">Average Daily Spend</div>
        <div class="insight-desc">
          Your average daily spending in July is <strong>${formatPKR(totals.totalSpent / 30)}</strong>. At this rate, your estimated monthly total will be <strong>${formatPKR((totals.totalSpent / 25) * 30)}</strong>.
        </div>
      </div>
    </div>
  `;
}

// 13. Calendar View logic
function renderCalendar() {
  if (!calendarCells) return;
  
  const year = currentCalDate.getFullYear();
  const month = currentCalDate.getMonth();
  
  calendarMonthYear.textContent = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  calendarCells.innerHTML = '';
  
  const firstDayIndex = new Date(year, month, 1).getDay();
  const lastDayDate = new Date(year, month + 1, 0).getDate();
  const prevLastDayDate = new Date(year, month, 0).getDate();
  
  // Previous month dates padding
  for (let x = firstDayIndex; x > 0; x--) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell other-month';
    cell.innerHTML = `<span class="calendar-cell-num">${prevLastDayDate - x + 1}</span>`;
    calendarCells.appendChild(cell);
  }
  
  // Current month cells
  for (let i = 1; i <= lastDayDate; i++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';
    
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const dayExpenses = transactions.filter(tx => tx.date === dateStr);
    
    let cellContent = `<span class="calendar-cell-num">${i}</span>`;
    if (dayExpenses.length > 0) {
      cell.classList.add('has-expense');
      const totalDaySpent = dayExpenses.reduce((s, tx) => s + parseFloat(tx.amount), 0);
      cellContent += `
        <div class="calendar-expense-indicator" title="${dayExpenses.map(tx => `${tx.item}: Rs ${tx.amount}`).join('\n')}">
          ${formatPKR(totalDaySpent)}
        </div>
      `;
    }
    
    cell.innerHTML = cellContent;
    calendarCells.appendChild(cell);
  }
}

function changeMonth(direction) {
  currentCalDate.setMonth(currentCalDate.getMonth() + direction);
  renderCalendar();
}

// 14. Settings View Actions & Avatar Management
function setupSettingsListeners() {
  const settingsUsername = document.getElementById('settings-username');
  const settingsAvatarUrl = document.getElementById('settings-avatar-url');
  const settingsAvatarFile = document.getElementById('settings-avatar-file');
  const settingsAvatarPreview = document.getElementById('settings-avatar-preview');
  
  const settingsProfileForm = document.getElementById('settings-profile-form');
  const settingsAvatarForm = document.getElementById('settings-avatar-form');
  const settingsPasswordForm = document.getElementById('settings-password-form');

  // Trigger loading values when settings tab is viewed
  const settingsMenuItem = document.querySelector('.sidebar-menu .menu-item[data-tab="settings-view"]');
  if (settingsMenuItem) {
    settingsMenuItem.addEventListener('click', () => {
      if (settingsUsername) settingsUsername.value = currentProfile.username;
      if (settingsAvatarUrl) settingsAvatarUrl.value = currentProfile.avatar_url || '';
      if (settingsAvatarPreview) {
        settingsAvatarPreview.src = currentProfile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop';
      }
      renderSettingsCategories();
    });
  }

  // Preview local image upload instantly
  if (settingsAvatarFile && settingsAvatarPreview) {
    settingsAvatarFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const maxDimension = 150; // Keep avatar compact
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
              if (width > maxDimension) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              }
            } else {
              if (height > maxDimension) {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Get compressed Base64 string
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
            settingsAvatarPreview.src = compressedBase64;
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Update Profile Details (Username)
  if (settingsProfileForm) {
    settingsProfileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('settings-profile-submit-btn');
      const newUsername = settingsUsername.value.trim();
      if (!newUsername) return;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
      }

      try {
        if (isDemoMode) {
          currentProfile.username = newUsername;
          if (userDisplayName) userDisplayName.textContent = newUsername;
          alert("Profile details updated successfully (Demo Mode)!");
        } else {
          // 1. Update Supabase Auth user metadata
          const { error: authErr } = await supabase.auth.updateUser({
            data: { username: newUsername }
          });
          if (authErr) throw authErr;

          // 2. Update profiles table
          const { error: dbErr } = await supabase
            .from('profiles')
            .update({ username: newUsername })
            .eq('id', currentUser.id);
          if (dbErr) throw dbErr;

          currentProfile.username = newUsername;
          if (userDisplayName) userDisplayName.textContent = newUsername;
          alert("Profile details updated successfully!");
        }
      } catch (err) {
        alert("Failed to update profile: " + err.message);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
        }
      }
    });
  }

  // Update Profile Photo (Avatar)
  if (settingsAvatarForm) {
    settingsAvatarForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('settings-avatar-submit-btn');
      let finalAvatarUrl = settingsAvatarUrl.value.trim();

      // Check if file upload has a preview base64 string
      if (settingsAvatarPreview && settingsAvatarPreview.src.startsWith('data:image/')) {
        finalAvatarUrl = settingsAvatarPreview.src;
      }

      if (!finalAvatarUrl) {
        alert("Please paste a URL or upload a file first.");
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
      }

      try {
        if (isDemoMode) {
          currentProfile.avatar_url = finalAvatarUrl;
          updateAvatarDisplay(finalAvatarUrl);
          alert("Profile picture updated successfully (Demo Mode)!");
        } else {
          // 1. Save to local storage first (always succeeds!)
          safeStorage.setItem(`office_avatar_${currentUser.id}`, finalAvatarUrl);
          currentProfile.avatar_url = finalAvatarUrl;
          updateAvatarDisplay(finalAvatarUrl);

          // 2. Attempt to sync to Supabase auth metadata
          try {
            const { error: authErr } = await supabase.auth.updateUser({
              data: { avatar_url: finalAvatarUrl }
            });
            if (authErr) {
              console.warn("Failed to sync avatar to Supabase user metadata:", authErr.message);
            }
          } catch (apiErr) {
            console.warn("Failed to sync avatar to Supabase database:", apiErr.message);
          }

          alert("Profile picture updated successfully!");
        }
      } catch (err) {
        alert("Failed to update profile picture: " + err.message);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fa-solid fa-image"></i> Update Photo';
        }
      }
    });
  }

  // Change Password
  if (settingsPasswordForm) {
    settingsPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('settings-password-submit-btn');
      const newPasswordInput = document.getElementById('settings-new-password');
      const confirmPasswordInput = document.getElementById('settings-confirm-password');

      const newPass = newPasswordInput.value;
      const confPass = confirmPasswordInput.value;

      if (newPass.length < 6) {
        alert("Password must be at least 6 characters long.");
        return;
      }

      if (newPass !== confPass) {
        alert("Passwords do not match.");
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';
      }

      try {
        if (isDemoMode) {
          alert("Password change simulated successfully (Demo Mode)!");
        } else {
          const { error } = await supabase.auth.updateUser({ password: newPass });
          if (error) throw error;
          alert("Password updated successfully!");
        }
        newPasswordInput.value = '';
        confirmPasswordInput.value = '';
      } catch (err) {
        alert("Failed to update password: " + err.message);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<i class="fa-solid fa-key"></i> Update Password';
        }
      }
    });
  }
  // Manage Categories Forms & Functions
  const addCategoryForm = document.getElementById('settings-add-category-form');
  if (addCategoryForm) {
    addCategoryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('new-category-name');
      const colorInput = document.getElementById('new-category-color');
      
      const name = nameInput.value.trim();
      const color = colorInput.value;
      if (!name) return;
      
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      
      // Check for duplicates
      if (userCategories.some(cat => cat.id === id)) {
        alert("A category with this name already exists!");
        return;
      }
      
      const newCat = { id, name, color };
      userCategories.push(newCat);
      safeStorage.setItem(`office_categories_${currentUser.id}`, JSON.stringify(userCategories));
      
      nameInput.value = '';
      
      // Refresh
      loadCategories();
      renderSettingsCategories();
      renderAll();
    });
  }
}

function renderSettingsCategories() {
  const listContainer = document.getElementById('settings-categories-list');
  if (!listContainer) return;
  
  listContainer.innerHTML = '';
  
  if (userCategories.length === 0) {
    listContainer.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 10px; font-size: 13px;">No custom categories. Add one below!</div>';
    return;
  }
  
  userCategories.forEach(cat => {
    const item = document.createElement('div');
    item.style.display = 'flex';
    item.style.alignItems = 'center';
    item.style.justifyContent = 'space-between';
    item.style.padding = '8px 12px';
    item.style.borderRadius = '8px';
    item.style.background = 'var(--bg-secondary)';
    item.style.border = '1px solid var(--border-color)';
    item.style.marginTop = '5px';
    
    item.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <div style="width: 14px; height: 14px; border-radius: 50%; background-color: ${cat.color};"></div>
        <span style="font-size: 13px; font-weight: 600; color: var(--text-primary);">${cat.name}</span>
      </div>
      <button class="action-btn delete-category-btn" data-id="${cat.id}" style="color: var(--danger); border: none; background: transparent; cursor: pointer; padding: 4px;" title="Delete category">
        <i class="fa-regular fa-trash-can"></i>
      </button>
    `;
    listContainer.appendChild(item);
  });
  
  // Bind delete listener
  listContainer.querySelectorAll('.delete-category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const catId = btn.getAttribute('data-id');
      deleteCategory(catId);
    });
  });
}

function deleteCategory(catId) {
  if (confirm("Are you sure you want to delete this category? Any transactions associated with this category will be displayed as 'Other'.")) {
    userCategories = userCategories.filter(cat => cat.id !== catId);
    safeStorage.setItem(`office_categories_${currentUser.id}`, JSON.stringify(userCategories));
    
    // Refresh category mappings and dropdowns
    loadCategories();
    renderSettingsCategories();
    renderAll();
  }
}

function updateAvatarDisplay(url) {
  const defaultUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop';
  const imgUrl = url || defaultUrl;
  
  document.querySelectorAll('.profile-img').forEach(img => {
    img.src = imgUrl;
  });
  
  const settingsAvatarPreview = document.getElementById('settings-avatar-preview');
  if (settingsAvatarPreview) {
    settingsAvatarPreview.src = imgUrl;
  }
}

// 15. Action Handlers
async function handleAddExpense(e) {
  e.preventDefault();
  
  if (!isDemoMode && !currentUser) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      currentUser = session.user;
    } else {
      alert("Error: No active user session found. Please sign in again.");
      window.location.reload();
      return;
    }
  }
  
  const itemInput = document.getElementById('expense-item');
  const amountInput = document.getElementById('expense-amount');
  const dateInput = document.getElementById('expense-date');
  const categoryInput = document.getElementById('expense-category');
  
  const item = itemInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const date = dateInput.value;
  const category = categoryInput.value;
  
  if (!item || isNaN(amount) || amount <= 0 || !date) return;

  if (isDemoMode) {
    const newTx = {
      id: 'tx-demo-' + Date.now(),
      date,
      item,
      category,
      amount: toBaseCurrency(amount)
    };
    transactions.unshift(newTx);
    alert("Expense registered successfully (Demo Mode)!");
    itemInput.value = '';
    amountInput.value = '';
    renderAll();
    return;
  }

  try {
    const { error } = await supabase
      .from('transactions')
      .insert({
        date,
        item,
        category,
        amount: toBaseCurrency(amount),
        user_id: currentUser.id
      });
      
    if (error) throw error;
    
    alert("Expense registered successfully!");
    itemInput.value = '';
    amountInput.value = '';
    
    await loadDatabaseData();
  } catch (err) {
    alert("Error adding expense: " + err.message);
  }
}

function handleEditLimit(e) {
  e.preventDefault();
  const userId = currentUser ? currentUser.id : 'default';
  const key = `office_limit_${currentCurrency}_${userId}`;
  let currentLimitVal = parseFloat(safeStorage.getItem(key)) || DEFAULT_LIMITS[currentCurrency] || 100;
  
  const symbol = currentCurrency === 'USD' ? '$' : currentCurrency === 'GBP' ? '£' : 'PKR';
  const newLimit = prompt(`Enter new budget limit in ${currentCurrency} (${symbol}):`, currentLimitVal);
  if (newLimit === null) return;
  
  const val = parseFloat(newLimit);
  if (isNaN(val) || val <= 0) return;
  
  // Save the manual limit in the active currency
  safeStorage.setItem(key, val.toString());
  
  // Update global monthlyLimit (converted to PKR base)
  monthlyLimit = toBaseCurrency(val);
  
  renderAll();
}

// Theme toggles
function setupTheme() {
  const theme = safeStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcon(theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  safeStorage.setItem('theme', next);
  updateThemeIcon(next);
  renderCharts();
  if (reportsPieChartInstance) renderReportsTab();
}

function updateThemeIcon(theme) {
  const icon = themeToggleBtn.querySelector('i');
  if (theme === 'dark') icon.className = 'fa-solid fa-sun';
  else icon.className = 'fa-solid fa-moon';
}

// Run initialization when DOM is ready
try {
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
  
  // Register PWA Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('PWA Service Worker registered successfully:', reg.scope))
        .catch(err => console.error('PWA Service Worker registration failed:', err));
    });
  }
} catch (e) {
  alert("App Startup Error: " + e.message);
}

} catch (globalErr) {
  alert("GLOBAL CRASH IN APP.JS:\n" + globalErr.message + "\nStack:\n" + globalErr.stack);
}

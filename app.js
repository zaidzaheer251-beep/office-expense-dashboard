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

const isDemoMode = window.location.protocol === 'file:';

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

// Category metadata config
const CATEGORY_META = {
  milk: { name: "Milk (Dhood)", color: "#3b82f6" },
  food: { name: "Khana / Meals", color: "#10b981" },
  snacks: { name: "Snacks", color: "#f59e0b" },
  "tea-sugar": { name: "Tea & Sugar", color: "#a855f7" },
  household: { name: "Household / Plates", color: "#ec4899" },
  other: { name: "Other Expenses", color: "#64748b" }
};

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
  "cards-view": { title: "Office Cards", sub: "Monitor debit card spending and card limits." },
  "chat-view": { title: "Team Chat", sub: "Communicate with managers regarding office expenses." },
  "reports-view": { title: "Analytics & Reports", sub: "Detailed graphs and key insights of your spending." },
  "calendar-view": { title: "Calendar View", sub: "Track dates of office expenses visually." }
};

// UI Elements
const searchInput = document.getElementById('search-input');
const pageTitle = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');
const themeToggleBtn = document.getElementById('theme-toggle');

// Dashboard metrics elements
const metricReceived = document.getElementById('metric-received');
const metricSpent = document.getElementById('metric-spent');
const metricSpentSub = document.getElementById('metric-spent-sub');
const metricRemaining = document.getElementById('metric-remaining');
const metricRemainingSub = document.getElementById('metric-remaining-sub');
const metricBalance = document.getElementById('metric-balance');
const metricBalanceSub = document.getElementById('metric-balance-sub');

// Dashboard tables and panels
const transactionRows = document.getElementById('transaction-rows');
const categoryFilter = document.getElementById('category-filter');
const reportFilter = document.getElementById('report-filter');
const categoryListContainer = document.getElementById('category-list-container');
const budgetPctText = document.getElementById('budget-pct-text');
const budgetAlertMsg = document.getElementById('budget-alert-msg');
const addExpenseForm = document.getElementById('add-expense-form');
const editLimitBtn = document.getElementById('edit-limit-btn');

// Payments View Elements
const paymentRows = document.getElementById('payment-rows');
const addFundingForm = document.getElementById('add-funding-form');

// Transactions View Elements
const detailedTransactionRows = document.getElementById('detailed-transaction-rows');
const advCategoryFilter = document.getElementById('adv-category-filter');
const advSortFilter = document.getElementById('adv-sort-filter');
const advStartDate = document.getElementById('adv-start-date');
const advEndDate = document.getElementById('adv-end-date');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const filteredStatsText = document.getElementById('filtered-stats-text');

// Chat View Elements
const chatFeed = document.getElementById('chat-feed');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');

// Reports View Elements
const financialInsightsBox = document.getElementById('financial-insights-box');

// Calendar View Elements
const calendarCells = document.getElementById('calendar-cells');
const calendarMonthYear = document.getElementById('calendar-month-year');
const calPrevBtn = document.getElementById('cal-prev-btn');
const calNextBtn = document.getElementById('cal-next-btn');

// Auth Form elements
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authToggleLink = document.getElementById('auth-toggle-link');
const authToggleText = document.getElementById('auth-toggle-text');
const authUsernameGroup = document.getElementById('auth-username-group');
const authUsername = document.getElementById('auth-username');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const logoutBtn = document.getElementById('logout-btn');
const userDisplayName = document.getElementById('user-display-name');
const userDisplayRole = document.getElementById('user-display-role');

let isSignUpMode = false;

// Initialize Application
function init() {
  setupTheme();
  setupNavigation();
  setupAuthListeners();
  
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
  themeToggleBtn.addEventListener('click', toggleTheme);

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

  // Show demo button if running offline
  const demoContainer = document.getElementById('demo-mode-container');
  const demoBtn = document.getElementById('demo-mode-btn');
  if (isDemoMode && demoContainer && demoBtn) {
    demoContainer.style.display = 'block';
    demoBtn.addEventListener('click', () => {
      try {
        const demoSession = {
          user: {
            id: 'demo-user-id',
            email: 'demo@approx.com',
            user_metadata: { username: 'Aamir Computer', role: 'admin' }
          }
        };
        handleAuthState(demoSession);
      } catch (err) {
        alert("Demo Mode Click Error: " + err.message + "\nStack: " + err.stack);
      }
    });
  }

  // Check current session immediately
  checkSession();
}

// 4. Tab Navigation Logic
function setupNavigation() {
  const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
  
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
        } else if (tabId === 'chat-view') {
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
  if (authToggleLink) {
    authToggleLink.addEventListener('click', (e) => {
      e.preventDefault();
      isSignUpMode = !isSignUpMode;
      if (isSignUpMode) {
        authTitle.textContent = 'Create Account';
        authSubtitle.textContent = 'Register to start tracking office expenses';
        authSubmitBtn.textContent = 'Sign Up';
        authToggleText.textContent = 'Already have an account?';
        authToggleLink.textContent = 'Sign In';
        authUsernameGroup.style.display = 'block';
        authUsername.required = true;
      } else {
        authTitle.textContent = 'Welcome Back';
        authSubtitle.textContent = 'Sign in to manage your office expenses';
        authSubmitBtn.textContent = 'Sign In';
        authToggleText.textContent = "Don't have an account?";
        authToggleLink.textContent = 'Sign Up';
        authUsernameGroup.style.display = 'none';
        authUsername.required = false;
      }
    });
  }

  if (authForm) {
    authForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = authEmail.value.trim();
      const password = authPassword.value;
      const username = authUsername.value.trim();
      
      authSubmitBtn.disabled = true;
      authSubmitBtn.textContent = isSignUpMode ? 'Signing Up...' : 'Signing In...';
      
      try {
        if (isSignUpMode) {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: window.location.origin + window.location.pathname,
              data: {
                username: username || email.split('@')[0],
                role: 'admin' // First users default to admin for management
              }
            }
          });
          if (error) throw error;
          alert('Registration successful! If required, please confirm your email, otherwise try logging in.');
          authToggleLink.click();
        } else {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
        }
      } catch (err) {
        alert(err.message || 'Authentication error');
      } finally {
        authSubmitBtn.disabled = false;
        authSubmitBtn.textContent = isSignUpMode ? 'Sign Up' : 'Sign In';
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to log out?')) {
        if (isDemoMode) {
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
  if (isDemoMode) {
    // If a demo session was active, auto-login
    const demoSessionActive = safeStorage.getItem('demo_session_active') === 'true';
    if (demoSessionActive) {
      const demoSession = {
        user: {
          id: 'demo-user-id',
          email: 'demo@approx.com',
          user_metadata: { username: 'Aamir Computer', role: 'admin' }
        }
      };
      handleAuthState(demoSession);
    }
    return;
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

      if (isDemoMode) {
        currentProfile = {
          username: currentUser.user_metadata?.username || 'Aamir Computer',
          role: currentUser.user_metadata?.role || 'admin'
        };
        safeStorage.setItem('demo_session_active', 'true');
      } else {
        // Fetch user profile info
        try {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

          currentProfile = profile || {
            username: currentUser.user_metadata?.username || currentUser.email.split('@')[0],
            role: currentUser.user_metadata?.role || 'employee'
          };
        } catch (e) {
          console.error("Profile load error:", e.message);
          currentProfile = {
            username: currentUser.email.split('@')[0],
            role: 'employee'
          };
        }
      }

      if (userDisplayName) userDisplayName.textContent = currentProfile.username;
      if (userDisplayRole) userDisplayRole.textContent = currentProfile.role.toUpperCase();

      // Toggle views
      if (authContainer) authContainer.classList.add('hidden');
      if (appContainer) appContainer.classList.remove('hidden');

      // Sync database data
      if (isDemoMode) {
        await loadDatabaseData();
      } else {
        await checkAndSeedDatabase();
        await loadDatabaseData();
        subscribeChats();
      }
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
        { sender_name: 'Manager', text: 'Salam, Aamir. Is mahine ke pantry aur tea logs review kar ke dashboard par dalen.' },
        { sender_name: 'Aamir Computer', text: 'Walaikum Assalam, sure sir. Main ne 07-07 se le kar 25-07 tak ke tamam expenses updates kar diye hain.' },
        { sender_name: 'Aamir Computer', text: 'Naye plates ka bill Rs 1,120 bhi register kiya hai pantry card se.' },
        { sender_name: 'Manager', text: 'Boht khoob! Total limit cross na ho, dhyaan rakhiyega. Good job.' }
      ];
      await supabase.from('chats').insert(chatsToSeed);
    }
  } catch (err) {
    console.error("Database seeding skipped or failed: ", err.message);
  }
}

// Async Data Fetching
async function loadDatabaseData() {
  if (isDemoMode) {
    let storedTxs = safeStorage.getItem('demo_transactions');
    if (!storedTxs) {
      storedTxs = JSON.stringify(INITIAL_TRANSACTIONS);
      safeStorage.setItem('demo_transactions', storedTxs);
    }
    transactions = JSON.parse(storedTxs).map((tx, idx) => ({
      id: tx.id || 'tx-mock-id-' + idx,
      ...tx
    }));

    let storedFunding = safeStorage.getItem('demo_funding');
    if (!storedFunding) {
      storedFunding = JSON.stringify(INITIAL_FUNDING);
      safeStorage.setItem('demo_funding', storedFunding);
    }
    fundingHistory = JSON.parse(storedFunding).map((f, idx) => ({
      id: f.id || 'fund-mock-id-' + idx,
      ...f
    }));

    let storedChats = safeStorage.getItem('demo_chats');
    if (!storedChats) {
      const chatsToSeed = [
        { sender_name: 'Manager', text: 'Salam, Aamir. Is mahine ke pantry aur tea logs review kar ke dashboard par dalen.' },
        { sender_name: 'Aamir Computer', text: 'Walaikum Assalam, sure sir. Main ne 07-07 se le kar 25-07 tak ke tamam expenses updates kar diye hain.' },
        { sender_name: 'Aamir Computer', text: 'Naye plates ka bill Rs 1,120 bhi register kiya hai pantry card se.' },
        { sender_name: 'Manager', text: 'Boht khoob! Total limit cross na ho, dhyaan rakhiyega. Good job.' }
      ];
      storedChats = JSON.stringify(chatsToSeed);
      safeStorage.setItem('demo_chats', storedChats);
    }
    const parsedChats = JSON.parse(storedChats);
    chats = parsedChats.map(msg => ({
      sender: msg.sender_name,
      text: msg.text,
      time: msg.created_at ? new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      type: msg.sender_name === currentProfile.username ? 'outgoing' : 'incoming'
    }));

    renderAll();
    return;
  }

  try {
    // 1. Fetch transactions
    const { data: txs, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });
    if (txError) throw txError;
    transactions = txs || [];

    // 2. Fetch funding
    const { data: fund, error: fundError } = await supabase
      .from('funding')
      .select('*')
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
      const mapped = {
        sender: newMsg.sender_name,
        text: newMsg.text,
        time: new Date(newMsg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        type: newMsg.sender_name === currentProfile.username ? 'outgoing' : 'incoming'
      };
      
      chats.push(mapped);
      renderChats();
      
      const activeTab = document.querySelector('.tab-view.active')?.id;
      if (activeTab === 'chat-view') {
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

// Formatting
function formatPKR(val) {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR', minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(val);
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
      safeStorage.setItem('demo_transactions', JSON.stringify(transactions));
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
  const sourceInput = document.getElementById('funding-source');
  const amountInput = document.getElementById('funding-amount');
  const dateInput = document.getElementById('funding-date');

  const source = sourceInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const date = dateInput.value;
  
  if (!source || isNaN(amount) || amount <= 0 || !date) return;
  
  if (isDemoMode) {
    const newFunding = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      source,
      date,
      amount,
      user_id: currentUser.id,
      created_at: new Date().toISOString()
    };
    fundingHistory.unshift(newFunding);
    safeStorage.setItem('demo_funding', JSON.stringify(fundingHistory));
    
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
        amount,
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
      safeStorage.setItem('demo_funding', JSON.stringify(fundingHistory));
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
  
  if (isDemoMode) {
    const rawChats = JSON.parse(safeStorage.getItem('demo_chats') || '[]');
    const newChat = {
      sender_name: currentProfile.username,
      text: txt,
      created_at: new Date().toISOString()
    };
    rawChats.push(newChat);
    safeStorage.setItem('demo_chats', JSON.stringify(rawChats));
    
    chatInput.value = '';
    
    // Refresh chats locally
    chats.push({
      sender: newChat.sender_name,
      text: newChat.text,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      type: 'outgoing'
    });
    renderChats();
    chatFeed.scrollTop = chatFeed.scrollHeight;
    return;
  }

  try {
    const { error } = await supabase
      .from('chats')
      .insert({
        sender_name: currentProfile.username,
        text: txt
      });
      
    if (error) throw error;
    chatInput.value = '';
  } catch (err) {
    alert("Error sending chat: " + err.message);
  }
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

// 14. Action Handlers
async function handleAddExpense(e) {
  e.preventDefault();
  
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
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      date,
      item,
      category,
      amount,
      user_id: currentUser.id,
      created_at: new Date().toISOString()
    };
    transactions.unshift(newTx);
    safeStorage.setItem('demo_transactions', JSON.stringify(transactions));
    
    alert("Expense registered successfully (Offline Mode)!");
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
        amount,
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
  const newLimit = prompt(`Enter new budget limit (current: ${monthlyLimit} PKR):`, monthlyLimit);
  if (newLimit === null) return;
  
  const val = parseFloat(newLimit);
  if (isNaN(val) || val <= 0) return;
  
  monthlyLimit = val;
  safeStorage.setItem('office_monthly_limit', monthlyLimit.toString());
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
} catch (e) {
  alert("App Startup Error: " + e.message);
}

} catch (globalErr) {
  alert("GLOBAL CRASH IN APP.JS:\n" + globalErr.message + "\nStack:\n" + globalErr.stack);
}

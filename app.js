// DiaLife – Diabetes Manager Application Logic

// Application State
let appState = {
  entries: [],
  settings: {
    targetMin: 4.0,
    targetMax: 8.0,
    basalTime: '22:00',
    mealDelay: '120'
  }
};

// Global Chart References
let trendChart = null;
let distributionChart = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  // Load settings and data from LocalStorage
  loadData();
  
  // Set default datetime to local current time in the form
  setDefaultDateTime();
  
  // Initialize UI components and event handlers
  initNavigation();
  initForms();
  initSettings();
  initBackupRestore();
  initNotifications();
  
  // Render Dashboard
  updateDashboard();
  
  // Generate/Update Lucide Icons
  lucide.createIcons();
  
  // Display dynamic current date
  const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  document.getElementById('current-date').innerText = new Date().toLocaleDateString('hu-HU', dateOptions);

  // Register Service Worker for PWA support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(reg => console.log('Service Worker registered successfully!', reg))
      .catch(err => console.error('Service Worker registration failed:', err));
  }

  // Periodic check for Daily Basal Insulin Reminder (every 60s)
  setInterval(checkBasalReminder, 60000);
});

// Set default datetime input to now
function setDefaultDateTime() {
  const dateInput = document.getElementById('input-date');
  if (dateInput) {
    const now = new Date();
    // Offset for local timezone format YYYY-MM-DDThh:mm
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    dateInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}

// Load data from LocalStorage (or inject mockup data if empty)
function loadData() {
  const storedData = localStorage.getItem('dialife_data');
  const storedSettings = localStorage.getItem('dialife_settings');

  if (storedSettings) {
    const parsed = JSON.parse(storedSettings);
    appState.settings = { ...appState.settings, ...parsed };
    document.getElementById('target-min').value = appState.settings.targetMin;
    document.getElementById('target-max').value = appState.settings.targetMax;
    document.getElementById('reminder-basal-time').value = appState.settings.basalTime || '22:00';
    document.getElementById('reminder-meal-delay').value = appState.settings.mealDelay || '120';
  }

  if (storedData) {
    appState.entries = JSON.parse(storedData);
  } else {
    // Generate beautiful mockup data so the user is wowed at first glance
    appState.entries = generateMockData();
    saveData();
  }
}

// Save data to LocalStorage
function saveData() {
  localStorage.setItem('dialife_data', JSON.stringify(appState.entries));
  localStorage.setItem('dialife_settings', JSON.stringify(appState.settings));
}

// Generate Mock Data
function generateMockData() {
  const mock = [];
  const now = new Date();
  
  const categories = [
    { name: 'Éhgyomri', bg: 5.2, hour: 7, bolus: 0, basal: 14, carbs: 0, notes: 'Jó ébredési érték' },
    { name: 'Reggeli után', bg: 7.4, hour: 9, bolus: 4, basal: 0, carbs: 40, notes: 'Korpás zsemle és zöldségek' },
    { name: 'Ebéd előtt', bg: 5.8, hour: 12, bolus: 6, basal: 0, carbs: 55, notes: 'Csirke rizzsel' },
    { name: 'Vacsora után', bg: 8.2, hour: 19, bolus: 5, basal: 0, carbs: 45, notes: 'Barna kenyér sonkával' },
    { name: 'Lefekvés előtt', bg: 6.1, hour: 22, bolus: 0, basal: 0, carbs: 10, notes: 'Lassú felszívódású keksz' }
  ];

  // Generate for the last 3 days
  for (let i = 2; i >= 0; i--) {
    categories.forEach(item => {
      const entryDate = new Date(now);
      entryDate.setDate(now.getDate() - i);
      entryDate.setHours(item.hour, Math.floor(Math.random() * 30), 0, 0);
      
      // Add slight randomness to values
      const bgRandom = Math.round((item.bg + (Math.random() * 1.6 - 0.8)) * 10) / 10;
      const carbRandom = item.carbs > 0 ? item.carbs + Math.floor(Math.random() * 11 - 5) : 0;
      
      mock.push({
        id: 'mock-' + entryDate.getTime() + '-' + Math.random(),
        datetime: entryDate.toISOString(),
        category: item.name,
        bg: bgRandom,
        insulinBolus: item.bolus,
        insulinBasal: item.basal,
        carbs: carbRandom,
        notes: item.notes
      });
    });
  }

  // Sort descending by date
  return mock.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
}

// Navigation & Tabs System
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const tabs = document.querySelectorAll('.tab-content');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');
      
      // Update active nav state
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      
      // Update active tab visibility
      tabs.forEach(tab => {
        if (tab.id === `tab-${targetTab}`) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });

      // Dynamically update titles
      const pageTitle = document.getElementById('page-title');
      const pageSubtitle = document.getElementById('page-subtitle');
      
      switch(targetTab) {
        case 'dashboard':
          pageTitle.innerText = 'Irányítópult';
          pageSubtitle.innerText = 'Statisztikák és gyors áttekintés.';
          updateDashboard();
          break;
        case 'new-entry':
          pageTitle.innerText = 'Új mérés rögzítése';
          pageSubtitle.innerText = 'Add meg a vércukor, inzulin és szénhidrát adatokat.';
          setDefaultDateTime();
          break;
        case 'history':
          pageTitle.innerText = 'Mérési napló';
          pageSubtitle.innerText = 'A rögzített mérések teljes listája és szűrése.';
          renderHistoryTable();
          break;
        case 'sos':
          pageTitle.innerText = 'SOS Segítségnyújtás';
          pageSubtitle.innerText = 'Gyors eljárások alacsony vagy magas vércukor esetén.';
          break;
        case 'settings':
          pageTitle.innerText = 'Beállítások';
          pageSubtitle.innerText = 'Testreszabás és adatok biztonsági mentése.';
          break;
      }
      
      lucide.createIcons();
    });
  });

  // Handle cross-tab navigation links
  document.querySelectorAll('[data-go-tab]').forEach(el => {
    el.addEventListener('click', () => {
      const target = el.getAttribute('data-go-tab');
      const matchingNavItem = document.querySelector(`.nav-item[data-tab="${target}"]`);
      if (matchingNavItem) {
        matchingNavItem.click();
      }
    });
  });

  // History button on dashboard
  document.getElementById('btn-view-all-history').addEventListener('click', () => {
    document.querySelector('.nav-item[data-tab="history"]').click();
  });
}

// Form Handlers
function initForms() {
  const form = document.getElementById('entry-form');
  const cancelBtn = document.getElementById('btn-form-cancel');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const datetime = document.getElementById('input-date').value;
    const category = document.getElementById('input-category').value;
    const bgVal = parseFloat(document.getElementById('input-bg').value);
    const bolusVal = parseFloat(document.getElementById('input-insulin-bolus').value);
    const basalVal = parseFloat(document.getElementById('input-insulin-basal').value);
    const carbsVal = parseInt(document.getElementById('input-carbs').value);
    const notes = document.getElementById('input-notes').value.trim();

    // Check that at least one value is filled
    if (isNaN(bgVal) && isNaN(bolusVal) && isNaN(basalVal) && isNaN(carbsVal)) {
      showToast('Kérjük, legalább egy mért értéket (vércukor, inzulin vagy szénhidrát) adj meg!', 'error');
      return;
    }

    const newEntry = {
      id: 'entry-' + Date.now(),
      datetime: new Date(datetime).toISOString(),
      category: category,
      bg: isNaN(bgVal) ? null : bgVal,
      insulinBolus: isNaN(bolusVal) ? null : bolusVal,
      insulinBasal: isNaN(basalVal) ? null : basalVal,
      carbs: isNaN(carbsVal) ? null : carbsVal,
      notes: notes
    };

    appState.entries.push(newEntry);
    // Sort descending
    appState.entries.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
    
    saveData();
    showToast('Bejegyzés sikeresen mentve!', 'success');

    // Schedule post-meal reminder if applicable
    scheduleMealReminder(category);
    
    // Clear and redirect to dashboard
    form.reset();
    document.querySelector('.nav-item[data-tab="dashboard"]').click();
  });

  cancelBtn.addEventListener('click', () => {
    form.reset();
    document.querySelector('.nav-item[data-tab="dashboard"]').click();
  });
}

// Settings Handlers
function initSettings() {
  const saveBtn = document.getElementById('btn-save-targets');
  const clearBtn = document.getElementById('btn-clear-all');

  saveBtn.addEventListener('click', () => {
    const minVal = parseFloat(document.getElementById('target-min').value);
    const maxVal = parseFloat(document.getElementById('target-max').value);

    if (isNaN(minVal) || isNaN(maxVal) || minVal >= maxVal) {
      showToast('Érvénytelen tartomány értékek!', 'error');
      return;
    }

    appState.settings.targetMin = minVal;
    appState.settings.targetMax = maxVal;
    
    saveData();
    showToast('Célértékek sikeresen elmentve!', 'success');
  });

  clearBtn.addEventListener('click', () => {
    if (confirm('Biztosan törölni szeretnél minden rögzített adatot? Ez a művelet nem vonható vissza!')) {
      appState.entries = [];
      saveData();
      showToast('Minden adat törölve lett.', 'success');
      updateDashboard();
    }
  });
}

// Backup and Restore (Import/Export) Logic
function initBackupRestore() {
  const exportJsonBtn = document.getElementById('btn-export-json');
  const exportCsvBtn = document.getElementById('btn-export-csv');
  const importFile = document.getElementById('import-file');
  const triggerImportBtn = document.getElementById('btn-trigger-import');
  const importFileName = document.getElementById('import-file-name');

  // JSON Export
  exportJsonBtn.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `dialife_mentes_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('JSON biztonsági mentés letöltve.', 'success');
  });

  // CSV Export (Excel/Doctor friendly)
  exportCsvBtn.addEventListener('click', () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // BOM to support excel characters
    csvContent += "Dátum,Időpont,Kategória,Vércukor (mmol/l),Gyors inzulin (E),Lassú inzulin (E),Szénhidrát (g),Megjegyzés\r\n";

    appState.entries.forEach(e => {
      const dt = new Date(e.datetime);
      const dateStr = dt.toLocaleDateString('hu-HU');
      const timeStr = dt.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
      
      const bg = e.bg !== null ? e.bg : "";
      const bolus = e.insulinBolus !== null ? e.insulinBolus : "";
      const basal = e.insulinBasal !== null ? e.insulinBasal : "";
      const carbs = e.carbs !== null ? e.carbs : "";
      const note = e.notes ? e.notes.replace(/"/g, '""') : "";

      csvContent += `${dateStr},${timeStr},"${e.category}",${bg},${bolus},${basal},${carbs},"${note}"\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `dialife_naplo_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('CSV napló sikeresen exportálva.', 'success');
  });

  // Import JSON Trigger
  triggerImportBtn.addEventListener('click', () => {
    importFile.click();
  });

  importFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    importFileName.innerText = file.name;

    const reader = new FileReader();
    reader.onload = function(event) {
      try {
        const importedData = JSON.parse(event.target.result);
        
        if (importedData.entries && Array.isArray(importedData.entries)) {
          appState.entries = importedData.entries;
          if (importedData.settings) {
            appState.settings = importedData.settings;
            document.getElementById('target-min').value = appState.settings.targetMin;
            document.getElementById('target-max').value = appState.settings.targetMax;
          }
          saveData();
          showToast('Adatok sikeresen visszaállítva!', 'success');
          updateDashboard();
        } else {
          showToast('Érvénytelen fájlformátum!', 'error');
        }
      } catch (err) {
        showToast('Hiba a fájl feldolgozása során!', 'error');
      }
    };
    reader.readAsText(file);
  });
}

// Update Dashboard Numbers & Render Charts
function updateDashboard() {
  // Recent logs
  renderRecentLogs();
  
  // Calculate statistics
  const bgEntries = appState.entries.filter(e => e.bg !== null);
  
  // 1. Last measured glucose
  const lastBgElement = document.getElementById('stat-last-bg');
  const lastTimeElement = document.getElementById('stat-last-time');
  
  if (bgEntries.length > 0) {
    const last = bgEntries[0];
    lastBgElement.innerText = last.bg.toFixed(1);
    
    // Apply styling based on target range
    lastBgElement.className = 'metric-value ' + getGlucoseColorClass(last.bg);
    
    const lastDate = new Date(last.datetime);
    lastTimeElement.innerText = lastDate.toLocaleDateString('hu-HU') + ' ' + lastDate.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
  } else {
    lastBgElement.innerText = '-';
    lastBgElement.className = 'metric-value';
    lastTimeElement.innerText = 'Nincs rögzített érték';
  }

  // 2. Average glucose
  const avgBgElement = document.getElementById('stat-avg-bg');
  if (bgEntries.length > 0) {
    const sum = bgEntries.reduce((acc, curr) => acc + curr.bg, 0);
    const avg = sum / bgEntries.length;
    avgBgElement.innerText = avg.toFixed(1);
    avgBgElement.className = 'metric-value ' + getGlucoseColorClass(avg);
  } else {
    avgBgElement.innerText = '-';
    avgBgElement.className = 'metric-value';
  }

  // 3. Time In Range (TIR)
  const tirElement = document.getElementById('stat-tir');
  if (bgEntries.length > 0) {
    const inRangeCount = bgEntries.filter(e => e.bg >= appState.settings.targetMin && e.bg <= appState.settings.targetMax).length;
    const tirPercent = Math.round((inRangeCount / bgEntries.length) * 100);
    tirElement.innerText = tirPercent;
  } else {
    tirElement.innerText = '-';
  }

  // 4. Today's carbs and insulin totals
  const todayCarbInsElement = document.getElementById('stat-carb-ins');
  const todayEntries = appState.entries.filter(e => {
    const entryDate = new Date(e.datetime);
    const today = new Date();
    return entryDate.getDate() === today.getDate() &&
           entryDate.getMonth() === today.getMonth() &&
           entryDate.getFullYear() === today.getFullYear();
  });

  const todayCarbs = todayEntries.reduce((sum, curr) => sum + (curr.carbs || 0), 0);
  const todayBolus = todayEntries.reduce((sum, curr) => sum + (curr.insulinBolus || 0), 0);
  const todayBasal = todayEntries.reduce((sum, curr) => sum + (curr.insulinBasal || 0), 0);
  const totalInsulin = todayBolus + todayBasal;

  todayCarbInsElement.innerHTML = `<span class="text-orange">${todayCarbs}g</span> / <span class="text-blue">${totalInsulin} E</span>`;

  // Draw Charts
  initCharts(bgEntries);

  // Update the daily progress tracker banner
  updateDailyTracker();
}

// Get range class for styling text
function getGlucoseColorClass(value) {
  if (value < appState.settings.targetMin) {
    return 'text-red'; // Hypo
  } else if (value > appState.settings.targetMax) {
    return 'text-orange'; // Hyper
  }
  return 'text-green'; // Normal
}

// Helper to determine status badge for table row
function getGlucoseBadge(value) {
  if (value === null) return '-';
  if (value < appState.settings.targetMin) {
    return `<span class="badge bg-status-danger">${value.toFixed(1)} (Alacsony)</span>`;
  } else if (value > appState.settings.targetMax) {
    return `<span class="badge bg-status-warning">${value.toFixed(1)} (Magas)</span>`;
  }
  return `<span class="badge bg-status-optimal">${value.toFixed(1)} (Célban)</span>`;
}

// Render recent logs in Dashboard table
function renderRecentLogs() {
  const tbody = document.getElementById('recent-logs-tbody');
  tbody.innerHTML = '';
  
  const recent = appState.entries.slice(0, 5); // display 5 most recent
  
  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center;" class="text-muted">Nincsenek bejegyzések.</td></tr>`;
    return;
  }

  recent.forEach(e => {
    const tr = document.createElement('tr');
    const dt = new Date(e.datetime);
    const dateStr = dt.toLocaleDateString('hu-HU') + ' ' + dt.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
    
    const bolus = e.insulinBolus ? `<span class="badge bg-badge-fast">${e.insulinBolus} E</span>` : '';
    const basal = e.insulinBasal ? `<span class="badge bg-badge-slow">${e.insulinBasal} E</span>` : '';
    
    tr.innerHTML = `
      <td>${dateStr}</td>
      <td><span class="category-tag">${e.category}</span></td>
      <td>${getGlucoseBadge(e.bg)}</td>
      <td>${bolus} ${basal ? ' / ' + basal : ''}</td>
      <td>${e.carbs ? `<span class="badge bg-badge-carb">${e.carbs}g</span>` : '-'}</td>
      <td>
        <button class="btn-icon-only" onclick="deleteEntry('${e.id}')" title="Törlés">
          <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  lucide.createIcons();
}

// Delete single log entry
window.deleteEntry = function(id) {
  if (confirm('Biztosan törölni szeretnéd ezt a bejegyzést?')) {
    appState.entries = appState.entries.filter(e => e.id !== id);
    saveData();
    showToast('Bejegyzés törölve.', 'success');
    
    // Update whichever tab is currently active
    const activeTab = document.querySelector('.nav-item.active').getAttribute('data-tab');
    if (activeTab === 'dashboard') {
      updateDashboard();
    } else if (activeTab === 'history') {
      renderHistoryTable();
    }
  }
};

// Render history view with filters
function renderHistoryTable() {
  const tbody = document.getElementById('history-logs-tbody');
  const searchVal = document.getElementById('search-history').value.toLowerCase();
  const filterCat = document.getElementById('filter-category').value;
  
  tbody.innerHTML = '';
  
  let filtered = appState.entries;

  // Apply filters
  if (searchVal) {
    filtered = filtered.filter(e => e.notes && e.notes.toLowerCase().includes(searchVal));
  }

  if (filterCat !== 'all') {
    if (filterCat === 'Étkezés előtt') {
      filtered = filtered.filter(e => e.category.includes('előtt'));
    } else if (filterCat === 'Étkezés után') {
      filtered = filtered.filter(e => e.category.includes('után'));
    } else {
      filtered = filtered.filter(e => e.category === filterCat);
    }
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center;" class="text-muted">Nincs találat a szűrési feltételek alapján.</td></tr>`;
    return;
  }

  filtered.forEach(e => {
    const tr = document.createElement('tr');
    const dt = new Date(e.datetime);
    const dateStr = dt.toLocaleDateString('hu-HU') + ' ' + dt.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
    
    tr.innerHTML = `
      <td>${dateStr}</td>
      <td><span class="category-tag">${e.category}</span></td>
      <td>${getGlucoseBadge(e.bg)}</td>
      <td>${e.insulinBolus ? `<span class="badge bg-badge-fast">${e.insulinBolus} E</span>` : '-'}</td>
      <td>${e.insulinBasal ? `<span class="badge bg-badge-slow">${e.insulinBasal} E</span>` : '-'}</td>
      <td>${e.carbs ? `<span class="badge bg-badge-carb">${e.carbs}g</span>` : '-'}</td>
      <td class="text-muted" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${e.notes || ''}">${e.notes || '-'}</td>
      <td>
        <button class="btn-icon-only" onclick="deleteEntry('${e.id}')" title="Törlés">
          <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  lucide.createIcons();
}

// Add history list interactive filtering
document.getElementById('search-history').addEventListener('input', renderHistoryTable);
document.getElementById('filter-category').addEventListener('change', renderHistoryTable);

// Chart.js initialization
function initCharts(bgEntries) {
  // Destroy old charts to prevent duplicate canvases/memory leaks
  if (trendChart) trendChart.destroy();
  if (distributionChart) distributionChart.destroy();

  const trendCanvas = document.getElementById('trendChart');
  const distCanvas = document.getElementById('distributionChart');

  if (!trendCanvas || !distCanvas) return;

  if (bgEntries.length === 0) {
    // Render placeholder text instead of empty charts
    // Let's style the canvas containers dynamically or just draw an empty message.
    return;
  }

  // Filter trend values based on chosen range (default 7 days)
  const activeRangeBtn = document.querySelector('.filter-btn.active');
  const daysRange = activeRangeBtn ? activeRangeBtn.getAttribute('data-range') : '7';
  
  let chartDataEntries = [...bgEntries].reverse(); // oldest first for chronological chart
  
  if (daysRange !== 'all') {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(daysRange));
    chartDataEntries = chartDataEntries.filter(e => new Date(e.datetime) >= cutoffDate);
  }

  // 1. Line Trend Chart
  const labels = chartDataEntries.map(e => {
    const d = new Date(e.datetime);
    return d.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
  });
  
  const bgValues = chartDataEntries.map(e => e.bg);

  trendChart = new Chart(trendCanvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Vércukor (mmol/l)',
          data: bgValues,
          borderColor: '#0d9488', // Teal accent
          backgroundColor: 'rgba(13, 148, 136, 0.05)',
          borderWidth: 3,
          tension: 0.3,
          pointBackgroundColor: '#0d9488',
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          min: 2,
          suggestedMax: 10,
          grid: { color: '#f1f5f9' },
          ticks: { font: { family: 'Plus Jakarta Sans', weight: '600' } }
        },
        x: {
          grid: { display: false },
          ticks: {
            font: { family: 'Plus Jakarta Sans', size: 10 },
            maxRotation: 45,
            minRotation: 0
          }
        }
      }
    }
  });

  // 2. Pie / Donut distribution chart
  const lowCount = bgEntries.filter(e => e.bg < appState.settings.targetMin).length;
  const targetCount = bgEntries.filter(e => e.bg >= appState.settings.targetMin && e.bg <= appState.settings.targetMax).length;
  const highCount = bgEntries.filter(e => e.bg > appState.settings.targetMax).length;

  distributionChart = new Chart(distCanvas, {
    type: 'doughnut',
    data: {
      labels: ['Alacsony (< ' + appState.settings.targetMin + ')', 'Célban', 'Magas (> ' + appState.settings.targetMax + ')'],
      datasets: [{
        data: [lowCount, targetCount, highCount],
        backgroundColor: [
          '#ef4444', // Red (Alacsony)
          '#10b981', // Green (Célban)
          '#f97316'  // Orange (Magas)
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { family: 'Plus Jakarta Sans', weight: '600', size: 11 },
            padding: 15
          }
        }
      },
      cutout: '65%'
    }
  });
}

// Chart Time-Range Filters Event Listeners
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    
    // Re-render dashboard charts
    const bgEntries = appState.entries.filter(e => e.bg !== null);
    initCharts(bgEntries);
  });
});

// Toast Notifications System
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const iconName = type === 'success' ? 'check-circle' : 'alert-circle';
  toast.innerHTML = `
    <i data-lucide="${iconName}"></i>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  lucide.createIcons();

  // Slide out and remove toast after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s reverse forwards';
    toast.addEventListener('animationend', () => {
      toast.remove();
    });
  }, 3000);
}

// =============================================
// DAILY PROGRESS TRACKER
// =============================================

function updateDailyTracker() {
  const today = new Date();
  const todayEntries = appState.entries.filter(e => {
    const d = new Date(e.datetime);
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  });

  // Measurement count progress (goal: 4/day)
  const DAILY_GOAL = 4;
  const measCount = todayEntries.filter(e => e.bg !== null).length;
  const measPct = Math.min(Math.round((measCount / DAILY_GOAL) * 100), 100);
  document.getElementById('tracker-measurements-count').innerText = `${measCount} / ${DAILY_GOAL}`;
  document.getElementById('tracker-measurements-bar').style.width = `${measPct}%`;

  // Today's Time-In-Range
  const todayBg = todayEntries.filter(e => e.bg !== null);
  let tirPct = 0;
  if (todayBg.length > 0) {
    const inRange = todayBg.filter(e => e.bg >= appState.settings.targetMin && e.bg <= appState.settings.targetMax).length;
    tirPct = Math.round((inRange / todayBg.length) * 100);
  }
  document.getElementById('tracker-tir-count').innerText = `${tirPct}%`;
  document.getElementById('tracker-tir-bar').style.width = `${tirPct}%`;

  // Change TIR bar color based on quality
  const tirBar = document.getElementById('tracker-tir-bar');
  tirBar.className = 'progress-bar-fill';
  if (tirPct >= 70) {
    tirBar.classList.add('bg-green');
  } else if (tirPct >= 40) {
    tirBar.classList.add('bg-teal');
  } else {
    tirBar.style.backgroundColor = '#f97316'; // orange for low TIR
  }
}

// =============================================
// NOTIFICATION SYSTEM
// =============================================

function initNotifications() {
  const permBtn = document.getElementById('btn-request-notification-permission');
  const saveRemBtn = document.getElementById('btn-save-reminders');
  const testBtn = document.getElementById('btn-test-notification');
  const statusSpan = document.getElementById('notification-permission-status');

  // Check and display current permission state
  updatePermissionStatus();

  permBtn.addEventListener('click', async () => {
    if (!('Notification' in window)) {
      showToast('A böngésződ nem támogatja az értesítéseket.', 'error');
      return;
    }
    const permission = await Notification.requestPermission();
    updatePermissionStatus();
    if (permission === 'granted') {
      showToast('Értesítések engedélyezve!', 'success');
    } else {
      showToast('Az értesítések engedélyezése elutasítva.', 'error');
    }
  });

  saveRemBtn.addEventListener('click', () => {
    appState.settings.basalTime = document.getElementById('reminder-basal-time').value;
    appState.settings.mealDelay = document.getElementById('reminder-meal-delay').value;
    saveData();
    showToast('Emlékeztető beállítások mentve!', 'success');
  });

  testBtn.addEventListener('click', () => {
    if (Notification.permission !== 'granted') {
      showToast('Először engedélyezd az értesítéseket!', 'error');
      return;
    }
    showToast('Teszt értesítés 5 másodperc múlva...', 'success');
    setTimeout(() => {
      sendNotification(
        '🩸 DiaLife – Teszt értesítés',
        'Az értesítési rendszer sikeresen működik! Gondoskodj az egészségedről.'
      );
    }, 5000);
  });
}

function updatePermissionStatus() {
  const statusSpan = document.getElementById('notification-permission-status');
  const permBtn = document.getElementById('btn-request-notification-permission');
  if (!('Notification' in window)) {
    statusSpan.innerText = 'Értesítések nem támogatottak';
    permBtn.disabled = true;
    return;
  }
  if (Notification.permission === 'granted') {
    statusSpan.innerText = '✓ Értesítések engedélyezve';
    permBtn.style.borderColor = 'var(--green)';
    permBtn.style.color = 'var(--green)';
  } else if (Notification.permission === 'denied') {
    statusSpan.innerText = '✗ Értesítések le vannak tiltva (böngésző beállítás)';
    permBtn.disabled = true;
  } else {
    statusSpan.innerText = 'Rendszerértesítések engedélyezése';
  }
}

function sendNotification(title, body, icon = 'icon-192.png') {
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon });
  } catch (e) {
    // Some browsers (esp. mobile) require SW-based notifications
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, { body, icon });
      });
    }
  }
}

// Check if it's time for the daily basal insulin reminder
let basalReminderFiredToday = false;
function checkBasalReminder() {
  if (Notification.permission !== 'granted') return;
  const basalTime = appState.settings.basalTime || '22:00';
  const [targetHour, targetMin] = basalTime.split(':').map(Number);
  const now = new Date();
  const todayKey = now.toDateString();
  const lastFiredKey = localStorage.getItem('dialife_basal_fired');

  // Fire if current time matches the set hour/minute (within the same minute) and not already fired today
  if (
    now.getHours() === targetHour &&
    now.getMinutes() === targetMin &&
    lastFiredKey !== todayKey
  ) {
    localStorage.setItem('dialife_basal_fired', todayKey);
    sendNotification(
      '💉 DiaLife – Bázis inzulin emlékeztető',
      `Eljött az ideje a hosszúhatású inzulin beadásának! (Beállított idő: ${basalTime})`
    );
  }
}

// Schedule a meal-after reminder when an "előtt" category entry is saved
function scheduleMealReminder(categoryName) {
  const delayMin = parseInt(appState.settings.mealDelay || '120', 10);
  if (delayMin <= 0) return;
  if (Notification.permission !== 'granted') return;
  // Only schedule for pre-meal categories
  const preMealCategories = ['Reggeli előtt', 'Ebéd előtt', 'Vacsora előtt'];
  if (!preMealCategories.some(c => categoryName.includes(c.split(' ')[0]))) return;

  const mealLabel = categoryName.replace(' előtt', '');
  setTimeout(() => {
    sendNotification(
      `🩸 DiaLife – Étkezés utáni mérés ideje!`,
      `${delayMin} perc telt el a(z) ${mealLabel} óta. Ne felejtsd el megmérni a vércukrod!`
    );
  }, delayMin * 60 * 1000);
}

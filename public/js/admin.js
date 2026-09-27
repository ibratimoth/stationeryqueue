let currentTab = 'unhandled';
let rawJobsCache = []; // Holds fetched data from backend

document.addEventListener('DOMContentLoaded', () => {
  // Set default single date input value to today's local date YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  document.getElementById('singleDateInput').value = todayStr;
  
  fetchQueueData();
});

/**
 * Refresh analytics & job list
 */
async function fetchQueueData() {
  await Promise.all([
    loadAnalytics(),
    loadJobs()
  ]);
}

/**
 * Handle Tab Switching
 */
function switchQueueTab(status) {
  currentTab = status;
  
  const tabUnhandled = document.getElementById('tabUnhandled');
  const tabHandled = document.getElementById('tabHandled');
  const tabAll = document.getElementById('tabAll');

  const activeClass = 'flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-xs transition bg-delle-teal text-white shadow-sm flex items-center justify-center gap-2';
  const inactiveClass = 'flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-xs transition text-slate-500 hover:text-slate-800 flex items-center justify-center gap-2';

  tabUnhandled.className = status === 'unhandled' ? activeClass : inactiveClass;
  tabHandled.className = status === 'handled' ? activeClass : inactiveClass;
  if (tabAll) tabAll.className = status === 'all' ? activeClass : inactiveClass;

  loadJobs();
}

/**
 * Dynamic visibility toggle for date filters
 */
function toggleDateInputs() {
  const mode = document.getElementById('dateMode').value;
  const singleWrapper = document.getElementById('singleDateWrapper');
  const rangeWrapper = document.getElementById('rangeDateWrapper');

  singleWrapper.classList.add('hidden');
  rangeWrapper.classList.add('hidden');

  if (mode === 'single') {
    singleWrapper.classList.remove('hidden');
  } else if (mode === 'range') {
    rangeWrapper.classList.remove('hidden');
  }

  applyFilters();
}

/**
 * Clear all search & filter controls back to defaults
 */
function clearFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('dateMode').value = 'today';

  const todayStr = new Date().toISOString().split('T')[0];
  document.getElementById('singleDateInput').value = todayStr;
  document.getElementById('startDateInput').value = '';
  document.getElementById('endDateInput').value = '';

  document.getElementById('sortByInput').value = 'newest';

  toggleDateInputs();
}

/**
 * Load Analytics Summary
 */
async function loadAnalytics() {
  try {
    const res = await fetch('/api/admin/analytics');
    
    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }

    const result = await res.json();

    if (result.success && result.data) {
      const summary = result.data.summary || result.data;
      
      document.getElementById('statPending').innerText = summary.unhandledDocs || summary.pending || 0;
      document.getElementById('statCompleted').innerText = summary.handledDocs || summary.completedToday || 0;
      document.getElementById('statPages').innerText = summary.totalPages || 0;
    }
  } catch (error) {
    console.error('Error loading analytics:', error);
  }
}

/**
 * Fetch jobs for current tab status from backend
 */
async function loadJobs() {
  const tableBody = document.getElementById('queueTableBody');

  try {
    const statusParam = currentTab === 'all' ? '' : `?status=${currentTab}`;
    const res = await fetch(`/api/admin/jobs${statusParam}`);

    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }

    const result = await res.json();
    rawJobsCache = result.data || result.jobs || [];

    applyFilters();
  } catch (error) {
    console.error('Error fetching jobs:', error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-red-500 font-medium">
          Failed to load queue. Please try again.
        </td>
      </tr>`;
  }
}

/**
 * Filter, sort, and render dataset based on form controls
 */
function applyFilters() {
  const tableBody = document.getElementById('queueTableBody');
  const countBadge = document.getElementById('queueCountBadge');

  const searchQuery = document.getElementById('searchInput').value.trim().toLowerCase();
  const dateMode = document.getElementById('dateMode').value;
  const singleDateVal = document.getElementById('singleDateInput').value;
  const startDateVal = document.getElementById('startDateInput').value;
  const endDateVal = document.getElementById('endDateInput').value;
  const sortBy = document.getElementById('sortByInput').value;

  const todayStr = new Date().toISOString().split('T')[0];

  let filtered = rawJobsCache.filter(job => {
    if (currentTab !== 'all') {
      const jobStatus = (job.status || 'unhandled').toLowerCase();
      if (jobStatus !== currentTab) return false;
    }

    const refCode = (job.referenceNumber || job.ticketCode || '').toLowerCase();
    const docName = (job.originalFileName || '').toLowerCase();
    const matchesSearch = !searchQuery || refCode.includes(searchQuery) || docName.includes(searchQuery);

    if (!matchesSearch) return false;

    if (searchQuery && dateMode === 'today') {
      return true;
    }

    const jobDateObj = job.createdAt ? new Date(job.createdAt) : null;
    if (!jobDateObj || isNaN(jobDateObj)) return true;

    const jobDateStr = jobDateObj.toISOString().split('T')[0];

    if (dateMode === 'today') {
      return jobDateStr === todayStr;
    } else if (dateMode === 'single' && singleDateVal) {
      return jobDateStr === singleDateVal;
    } else if (dateMode === 'range') {
      if (startDateVal && jobDateStr < startDateVal) return false;
      if (endDateVal && jobDateStr > endDateVal) return false;
      return true;
    }

    return true; // dateMode === 'all'
  });

  filtered.sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    } else if (sortBy === 'oldest') {
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    } else if (sortBy === 'ref') {
      const refA = (a.referenceNumber || a.ticketCode || '').toLowerCase();
      const refB = (b.referenceNumber || b.ticketCode || '').toLowerCase();
      return refA.localeCompare(refB);
    } else if (sortBy === 'name') {
      const nameA = (a.originalFileName || '').toLowerCase();
      const nameB = (b.originalFileName || '').toLowerCase();
      return nameA.localeCompare(nameB);
    } else if (sortBy === 'pages') {
      return (b.pageCount || 1) - (a.pageCount || 1);
    }
    return 0;
  });

  tableBody.innerHTML = '';

  if (filtered.length > 0) {
    if (countBadge) countBadge.innerText = `${filtered.length} Jobs`;

    filtered.forEach(job => {
      const row = document.createElement('tr');
      row.className = 'hover:bg-slate-50/80 transition border-b border-slate-100';

      const createdObj = job.createdAt ? new Date(job.createdAt) : null;
      const formattedTime = createdObj 
        ? `${createdObj.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${createdObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
        : 'N/A';

      const isHandled = job.status === 'handled';

      row.innerHTML = `
        <td class="py-3.5 px-6 font-mono font-bold text-delle-teal text-xs">${job.referenceNumber || job.ticketCode || 'N/A'}</td>
        <td class="py-3.5 px-6 max-w-xs truncate font-medium text-slate-800" title="${job.originalFileName}">
          ${job.originalFileName}
        </td>
        <td class="py-3.5 px-6 font-semibold text-slate-600">${job.pageCount || 1} Page(s)</td>
        <td class="py-3.5 px-6 text-slate-400 font-medium">${formattedTime}</td>
        <td class="py-3.5 px-6">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
            isHandled
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          }">
            ${(job.status || currentTab).toUpperCase()}
          </span>
        </td>
        <td class="py-3.5 px-6 text-right space-x-2">
          <a href="/api/admin/jobs/${job.id}/preview" target="_blank" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition inline-flex items-center gap-1">
            <i class="fa-solid fa-eye"></i> View
          </a>
          <a href="/api/admin/jobs/${job.id}/download" class="px-3 py-1.5 bg-delle-teal-light hover:bg-delle-teal text-delle-teal hover:text-white rounded-lg font-bold text-xs transition inline-flex items-center gap-1">
            <i class="fa-solid fa-download"></i> Download
          </a>
          ${
            !isHandled
              ? `<button onclick="updateJobStatus('${job.id}', 'handled')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition inline-flex items-center gap-1">
                  <i class="fa-solid fa-check"></i> Mark Done
                 </button>`
              : ''
          }
        </td>
      `;
      tableBody.appendChild(row);
    });
  } else {
    if (countBadge) countBadge.innerText = '0 Jobs';
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="py-10 text-center text-slate-400 font-medium">
          <i class="fa-solid fa-inbox text-3xl mb-2 text-slate-300 block"></i>
          No print jobs matched your search criteria.
        </td>
      </tr>`;
  }
}

/**
 * Action Handler: Update Job Status
 */
async function updateJobStatus(id, status) {
  try {
    const res = await fetch(`/api/admin/jobs/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });

    const result = await res.json();
    if (result.success) {
      fetchQueueData();
    } else {
      alert(result.message || 'Failed to update job status');
    }
  } catch (error) {
    alert('Server connection error while updating job.');
  }
}
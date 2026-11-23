document.addEventListener('DOMContentLoaded', () => {
  const loginScreen = document.getElementById('loginScreen');
  const appScreen = document.getElementById('appScreen');
  const loginForm = document.getElementById('loginForm');
  const logoutBtn = document.getElementById('logoutBtn');
  const userRoleLabel = document.getElementById('userRoleLabel');
  const employeeDashboard = document.getElementById('employeeDashboard');
  const adminDashboard = document.getElementById('adminDashboard');
  const analystDashboard = document.getElementById('analystDashboard');
  const managerDashboard = document.getElementById('managerDashboard');
  const recordsSection = document.getElementById('recordsSection');
  const meetingEntryPanel = document.getElementById('meetingEntryPanel');

  const form = document.getElementById('meetingForm');
  const loadDemoBtn = document.getElementById('loadDemoBtn');
  const saveMeetingBtn = document.getElementById('saveMeetingBtn');
  const recordList = document.getElementById('recordList');
  const recordsCount = document.getElementById('recordsCount');
  const roleForm = document.getElementById('roleForm');
  const userRoleList = document.getElementById('userRoleList');
  const managerEmployeeForm = document.getElementById('managerEmployeeForm');
  const managerEmployeeList = document.getElementById('managerEmployeeList');
  const STORAGE_KEY = 'adaptive_meeting_records';
  const ROLE_STORAGE_KEY = 'adaptive_user_roles';
  let activePermissions = [];

  const defaultUsers = [
    { id: 'admin-default', name: 'Admin', role: 'Admin', permissions: ['Manage users', 'Manage roles', 'View reports', 'Approve decisions'] },
    { id: 'employee-default', name: 'Employee', role: 'Employee', permissions: ['View meetings', 'Create meetings'] },
    { id: 'manager-default', name: 'Manager', role: 'Manager', permissions: ['Manage employees', 'View reports'] },
    { id: 'analyst-default', name: 'Analyst', role: 'Analyst', permissions: ['View reports', 'View meetings'] }
  ];

  const today = new Date().toISOString().split('T')[0];

  const demoData = {
    meetingId: 'MT-101',
    meetingTitle: 'Quarterly Product Review',
    meetingDate: today,
    expectedDecision: 'Approve marketing plan and launch timeline',
    objective: 'Align the team on launch priorities, resolve blockers, and confirm the campaign budget.',
    agenda: 'Review campaign progress, confirm budget, resolve dependencies, assign final responsibilities.',
    participants: 8,
    duration: 45,
    topics: 4,
    unresolvedIssues: 2,
    previousTrend: 'Mixed',
    actionOwner: 'Marketing Lead'
  };

  function setFormValues(data) {
    Object.entries(data).forEach(([key, value]) => {
      const input = document.getElementById(key);
      if (input) {
        input.value = value;
      }
    });
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  function hasPermission(permission) {
    return activePermissions.includes(permission);
  }

  function getDefaultPermissions(role) {
    const user = defaultUsers.find((item) => item.role === role);
    return user ? user.permissions : [];
  }

  function getOutcome(score) {
    if (score >= 80) return { label: 'Successful', className: 'success' };
    if (score >= 60) return { label: 'Partially Successful', className: 'partial' };
    if (score >= 40) return { label: 'Needs Improvement', className: 'warning' };
    return { label: 'Unsuccessful', className: 'warning' };
  }

  function buildRecommendations(data, score) {
    const recommendations = [];

    if (data.objective.trim().length < 30) {
      recommendations.push('Define a clear objective before the meeting starts.');
    } else {
      recommendations.push('Keep the objective visible throughout the meeting.');
    }

    if (data.duration > 60) {
      recommendations.push('Shorten the session to keep discussion focused.');
    } else {
      recommendations.push('Keep the current duration because it supports productive discussion.');
    }

    if (Number(data.participants) > 10) {
      recommendations.push('Reduce the number of participants to avoid slow decision-making.');
    }

    if (Number(data.topics) > 5) {
      recommendations.push('Limit the number of topics to avoid unnecessary discussion.');
    }

    if (Number(data.unresolvedIssues) > 0) {
      recommendations.push('Review unresolved issues from prior meetings before moving forward.');
    }

    if (!data.expectedDecision || data.expectedDecision.trim().length < 15) {
      recommendations.push('State the final expected decision clearly at the start.');
    } else if (score >= 70) {
      recommendations.push('Confirm the final decision and assign owners for execution.');
    }

    if (!data.actionOwner || data.actionOwner.trim().length === 0) {
      recommendations.push('Assign a responsible owner for all action items.');
    }

    return recommendations.slice(0, 4);
  }

  function buildRisks(data) {
    const risks = [];

    if (data.objective.trim().length < 30) {
      risks.push('Objective is unclear');
    }
    if (Number(data.participants) > 10) {
      risks.push('Too many participants');
    }
    if (Number(data.duration) > 60) {
      risks.push('Meeting may run too long');
    }
    if (Number(data.topics) > 5) {
      risks.push('Too many discussion topics');
    }
    if (Number(data.unresolvedIssues) > 2) {
      risks.push('Unresolved issues carry forward');
    }
    if (!data.expectedDecision || data.expectedDecision.trim().length < 15) {
      risks.push('Decision is not clearly defined');
    }
    if (!data.actionOwner || data.actionOwner.trim().length === 0) {
      risks.push('No clear action ownership');
    }

    return risks.length ? risks : ['No major risks detected'];
  }

  function createExplanation(data, outcome) {
    const parts = [];

    if (data.objective.trim().length > 30) parts.push('a clear objective');
    if (data.agenda.trim().length > 30) parts.push('a well-defined agenda');
    if (Number(data.duration) >= 20 && Number(data.duration) <= 60) parts.push('a reasonable meeting duration');
    if (Number(data.topics) <= 5) parts.push('focused discussion topics');
    if (data.previousTrend === 'Strong') parts.push('positive previous meeting results');
    if (Number(data.unresolvedIssues) === 0) parts.push('few unresolved issues');

    if (parts.length === 0) {
      return 'The meeting has several risk factors, including weak structure and limited clarity, which reduces the likelihood of a strong outcome.';
    }

    const phrase = parts.slice(0, 3).join(', ');
    return `${outcome.label === 'Successful' ? 'Strong structure' : 'Moderate structure'} with ${phrase} suggests ${outcome.label.toLowerCase()} performance for this meeting.`;
  }

  function updatePrediction(data) {
    let score = 0;

    if (data.agenda.trim().length > 30) score += 15;
    else score -= 10;

    if (data.objective.trim().length > 30) score += 15;
    else score -= 10;

    if (Number(data.duration) >= 20 && Number(data.duration) <= 60) score += 15;
    else if (Number(data.duration) > 60) score -= 12;
    else score -= 6;

    if (Number(data.participants) <= 8) score += 12;
    else if (Number(data.participants) <= 12) score += 4;
    else score -= 12;

    if (Number(data.topics) <= 5) score += 12;
    else score -= 10;

    if (Number(data.unresolvedIssues) === 0) score += 10;
    else score -= Number(data.unresolvedIssues) * 8;

    if (data.previousTrend === 'Strong') score += 10;
    else if (data.previousTrend === 'Weak') score -= 12;

    if (data.expectedDecision.trim().length > 20) score += 12;
    else score -= 8;

    if (data.actionOwner.trim().length > 0) score += 8;
    else score -= 10;

    score = clamp(score, 0, 100);
    const outcome = getOutcome(score);
    const confidence = clamp(Math.round(score * 0.9), 55, 97);

    const badge = document.getElementById('outcomeBadge');
    badge.textContent = outcome.label;
    badge.className = `badge ${outcome.className}`;

    document.getElementById('outcomeText').textContent = outcome.label;
    document.getElementById('scoreValue').textContent = score;
    document.getElementById('confidenceValue').textContent = `${confidence}%`;
    document.getElementById('scoreBar').style.width = `${score}%`;
    document.getElementById('explanation').textContent = createExplanation(data, outcome);

    document.getElementById('recommendations').innerHTML = buildRecommendations(data, score)
      .map((item) => `<li>${item}</li>`)
      .join('');

    document.getElementById('risks').innerHTML = buildRisks(data)
      .map((item) => `<li>${item}</li>`)
      .join('');

    return { score, confidence, outcome: outcome.label };
  }

  function getCurrentMeetingData() {
    return {
      meetingId: document.getElementById('meetingId').value.trim(),
      meetingTitle: document.getElementById('meetingTitle').value.trim(),
      meetingDate: document.getElementById('meetingDate').value,
      expectedDecision: document.getElementById('expectedDecision').value.trim(),
      objective: document.getElementById('objective').value.trim(),
      agenda: document.getElementById('agenda').value.trim(),
      participants: Number(document.getElementById('participants').value || 0),
      duration: Number(document.getElementById('duration').value || 0),
      topics: Number(document.getElementById('topics').value || 0),
      unresolvedIssues: Number(document.getElementById('unresolvedIssues').value || 0),
      previousTrend: document.getElementById('previousTrend').value,
      actionOwner: document.getElementById('actionOwner').value.trim()
    };
  }

  function getSavedRecords() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];

    try {
      return JSON.parse(saved);
    } catch (error) {
      return [];
    }
  }

  function saveRecords(records) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  function getUserRoles() {
    const saved = localStorage.getItem(ROLE_STORAGE_KEY);
    if (!saved) {
      localStorage.setItem(ROLE_STORAGE_KEY, JSON.stringify(defaultUsers));
      return [...defaultUsers];
    }

    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || !parsed.length) return [...defaultUsers];

      return parsed.map((user) => {
        if (user.role === 'Analyst') {
          return {
            ...user,
            permissions: [...new Set([...(Array.isArray(user.permissions) ? user.permissions : []), 'View reports'])]
          };
        }
        if (user.id !== 'manager-default' && user.role !== 'Manager') return user;
        return {
          ...user,
          permissions: user.id === 'manager-default'
            ? ['Manage employees', 'View reports']
            : [...new Set([...(Array.isArray(user.permissions) ? user.permissions : []), 'Manage employees', 'View reports'])]
        };
      });
    } catch (error) {
      return [...defaultUsers];
    }
  }

  function saveUserRoles(users) {
    localStorage.setItem(ROLE_STORAGE_KEY, JSON.stringify(users));
  }

  function renderUserRoles() {
    const users = getUserRoles();

    if (!userRoleList) return;

    userRoleList.innerHTML = users.map((user) => `
      <div class="user-role-card">
        <div class="user-role-header">
          <strong>${escapeHTML(user.name)}</strong>
          <span class="record-badge ${user.role === 'Admin' ? 'success' : user.role === 'Manager' ? 'partial' : 'warning'}">${escapeHTML(user.role)}</span>
        </div>
        <div class="permission-tags">
          ${(user.permissions || []).map((permission) => `<span class="permission-tag">${escapeHTML(permission)}</span>`).join('') || '<span class="permission-tag">No permissions assigned</span>'}
        </div>
        <div class="form-actions" style="margin-top: 12px; justify-content: flex-end;">
          <button type="button" class="secondary-btn small delete-user-btn" data-user-id="${escapeHTML(user.id)}">Remove</button>
        </div>
      </div>
    `).join('');
  }

  function renderManagerEmployees() {
    const teamMembers = getUserRoles().filter((user) => user.role === 'Employee' || user.role === 'Analyst');
    managerEmployeeList.innerHTML = teamMembers.length ? teamMembers.map((member) => `
      <div class="user-role-card">
        <div class="user-role-header">
          <strong>${escapeHTML(member.name)}</strong>
          <span class="record-badge ${member.role === 'Analyst' ? 'partial' : 'success'}">${escapeHTML(member.role)}</span>
        </div>
        <div class="record-meta">Department: ${escapeHTML(member.department || 'Not specified')}</div>
        <div class="form-actions employee-actions">
          <button type="button" class="secondary-btn small delete-user-btn" data-employee-id="${escapeHTML(member.id)}">Remove ${escapeHTML(member.role.toLowerCase())}</button>
        </div>
      </div>
    `).join('') : '<div class="empty-state">No employees or analysts added yet.</div>';
  }

  function renderRecords() {
    const records = getSavedRecords();
    recordsCount.textContent = `${records.length} record${records.length === 1 ? '' : 's'}`;

    recordList.innerHTML = records.length ? records
      .slice()
      .reverse()
      .map((record) => {
        const badgeClass = record.outcome === 'Successful' ? 'success' : record.outcome === 'Partially Successful' ? 'partial' : 'warning';
        return `
          <div class="record-item">
            <div class="record-top">
              <h4>${escapeHTML(record.meetingTitle)}</h4>
              <span class="record-badge ${badgeClass}">${escapeHTML(record.outcome)}</span>
            </div>
            <div class="record-meta">Meeting ID: ${escapeHTML(record.meetingId || 'N/A')} â€¢ ${escapeHTML(record.meetingDate || 'No date')}</div>
            <div class="record-meta">Score: ${escapeHTML(record.score)} â€¢ Confidence: ${escapeHTML(record.confidence)}%</div>
            <div class="record-meta">Decision: ${escapeHTML(record.expectedDecision)}</div>
          </div>
        `;
      })
      .join('') : '<div class="empty-state">No saved meeting records yet.</div>';

    const latest = records.slice(-3).reverse();
    ['adminMeetingSummary', 'analystMeetingSummary', 'managerMeetingSummary'].forEach((id) => {
      const summaryList = document.getElementById(id);
      if (summaryList) {
        summaryList.innerHTML = latest.length ? latest.map((record) => `
          <li><strong>${escapeHTML(record.meetingTitle)}</strong> â€” ${escapeHTML(record.outcome)} (${escapeHTML(record.score)})</li>
        `).join('') : '<li>No saved meetings yet.</li>';
      }
    });

    const stats = {
      TotalMeetings: records.length,
      SuccessfulMeetings: records.filter((record) => record.outcome === 'Successful').length,
      HighRisk: records.filter((record) => record.outcome === 'Needs Improvement' || record.outcome === 'Unsuccessful').length,
      PendingItems: records.filter((record) => record.unresolvedIssues && Number(record.unresolvedIssues) > 0).length
    };
    Object.entries(stats).forEach(([key, value]) => {
      ['admin', 'analyst'].forEach((prefix) => {
        const element = document.getElementById(`${prefix}${key}`);
        if (element) element.textContent = value;
      });
    });
  }

  function saveCurrentMeeting() {
    if (!hasPermission('Create meetings')) {
      alert('Your assigned role does not allow creating meetings.');
      return;
    }

    const data = getCurrentMeetingData();
    const prediction = updatePrediction(data);
    const records = getSavedRecords();

    const entry = {
      ...data,
      outcome: prediction.outcome,
      score: prediction.score,
      confidence: prediction.confidence,
      savedAt: new Date().toISOString()
    };

    records.push(entry);
    saveRecords(records);
    renderRecords();
    alert('Meeting saved successfully.');
  }

  function showApp(username, role, permissions) {
    activePermissions = permissions;
    userRoleLabel.textContent = `${username} Â· ${role}`;
    loginScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');

    const isAdmin = role === 'Admin';
    const isManager = role === 'Manager' && hasPermission('Manage employees');
    const isAnalyst = role === 'Analyst';
    const canCreateMeetings = hasPermission('Create meetings');
    const canViewMeetings = hasPermission('View meetings');
    const canViewReports = hasPermission('View reports');

    employeeDashboard.classList.toggle('hidden', isAdmin || isManager || isAnalyst || !canCreateMeetings);
    meetingEntryPanel.classList.toggle('hidden', !canCreateMeetings);
    adminDashboard.classList.toggle('hidden', !isAdmin);
    adminDashboard.querySelector('.admin-stats-grid').classList.toggle('hidden', !canViewReports);
    analystDashboard.classList.toggle('hidden', !isAnalyst || !canViewReports);
    managerDashboard.classList.toggle('hidden', !isManager);
    recordsSection.classList.toggle('hidden', !(isAdmin || (isAnalyst && canViewReports) || (isManager && canViewReports) || (!isManager && !isAnalyst && !isAdmin && (canViewMeetings || canViewReports))));

    document.querySelector('.role-box').classList.toggle('hidden', !isAdmin || !hasPermission('Manage users'));
    document.getElementById('adminMeetingSummary').closest('.mini-box').classList.toggle('hidden', !canViewReports);
    renderManagerEmployees();
  }

  function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const selectedRole = document.querySelector('input[name="role"]:checked');
    const role = selectedRole ? selectedRole.value : '';

    if (!username || !password || !role) {
      alert('Please enter both username and password, and select a role.');
      return;
    }

    const assignedUser = getUserRoles().find((user) => user.name.toLowerCase() === username.toLowerCase());
    if (assignedUser && assignedUser.role !== role) {
      alert(`This username is assigned the ${assignedUser.role} role. Select that role to continue.`);
      return;
    }

    const permissions = assignedUser && Array.isArray(assignedUser.permissions)
      ? assignedUser.permissions
      : getDefaultPermissions(role);
    showApp(username, role, permissions);
  }

  function handleLogout() {
    appScreen.classList.add('hidden');
    loginScreen.classList.remove('hidden');
    loginForm.reset();
  }

  function handleRoleSubmit(event) {
    event.preventDefault();

    if (!hasPermission('Manage users')) {
      alert('Your assigned role does not allow managing users.');
      return;
    }

    const name = document.getElementById('userName').value.trim();
    const role = document.getElementById('userRole').value;
    const permissions = Array.from(document.querySelectorAll('.permission-item input:checked')).map((input) => input.value);

    if (!name) {
      alert('Please enter a user name.');
      return;
    }

    const users = getUserRoles();
    if (users.some((user) => user.name.toLowerCase() === name.toLowerCase())) {
      alert('A user with this name already exists.');
      return;
    }

    if (role === 'Manager' && !permissions.includes('Manage employees')) {
      permissions.push('Manage employees');
    }
    if (role === 'Manager' && !permissions.includes('View reports')) {
      permissions.push('View reports');
    }
    if (role === 'Analyst' && !permissions.includes('View reports')) {
      permissions.push('View reports');
    }

    users.push({
      id: `user-${Date.now()}`,
      name,
      role,
      permissions
    });

    saveUserRoles(users);
    renderUserRoles();
    roleForm.reset();
    document.querySelector('.permission-item input').checked = true;
  }

  userRoleList.addEventListener('click', (event) => {
    if (!hasPermission('Manage users')) {
      alert('Your assigned role does not allow managing users.');
      return;
    }

    const removeButton = event.target.closest('[data-user-id]');
    if (!removeButton) return;

    const userId = removeButton.getAttribute('data-user-id');
    const users = getUserRoles().filter((user) => user.id !== userId);
    saveUserRoles(users);
    renderUserRoles();
  });

  managerEmployeeForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!hasPermission('Manage employees')) {
      alert('Your assigned role does not allow managing employees.');
      return;
    }

    const name = document.getElementById('managerEmployeeName').value.trim();
    const role = document.getElementById('managerTeamRole').value;
    const department = document.getElementById('managerEmployeeDepartment').value.trim();
    if (!name) {
      alert('Please enter an employee name.');
      return;
    }

    const users = getUserRoles();
    if (users.some((user) => user.name.toLowerCase() === name.toLowerCase())) {
      alert('A user with this name already exists.');
      return;
    }

    users.push({
      id: `employee-${Date.now()}`,
      name,
      role,
      department,
      permissions: getDefaultPermissions(role)
    });
    saveUserRoles(users);
    renderManagerEmployees();
    renderUserRoles();
    managerEmployeeForm.reset();
  });

  managerEmployeeList.addEventListener('click', (event) => {
    if (!hasPermission('Manage employees')) {
      alert('Your assigned role does not allow managing employees.');
      return;
    }

    const removeButton = event.target.closest('[data-employee-id]');
    if (!removeButton) return;
    const employeeId = removeButton.getAttribute('data-employee-id');
    const users = getUserRoles().filter((user) => !(user.id === employeeId && user.role === 'Employee'));
    saveUserRoles(users);
    renderManagerEmployees();
    renderUserRoles();
  });

  loginForm.addEventListener('submit', handleLogin);
  logoutBtn.addEventListener('click', handleLogout);
  roleForm.addEventListener('submit', handleRoleSubmit);
  loadDemoBtn.addEventListener('click', () => setFormValues(demoData));
  saveMeetingBtn.addEventListener('click', saveCurrentMeeting);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!hasPermission('Create meetings')) {
      alert('Your assigned role does not allow creating meetings.');
      return;
    }
    const data = getCurrentMeetingData();
    updatePrediction(data);
  });

  setFormValues(demoData);
  updatePrediction(getCurrentMeetingData());
  renderRecords();
  renderUserRoles();
  renderManagerEmployees();
  appScreen.classList.add('hidden');
  loginScreen.classList.remove('hidden');
});

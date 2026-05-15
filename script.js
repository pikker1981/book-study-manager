const STORAGE_KEY = 'book-study-manager-v1';

const initialState = {
  books: [
    {
      id: crypto.randomUUID(),
      title: '지구 끝의 온실',
      author: '김초엽',
      coverImage: '',
      startDate: '2026-05-01',
      endDate: '2026-05-31',
      status: 'reading',
      memo: '5월 독서모임 선정 도서'
    }
  ],
  members: [
    { id: crypto.randomUUID(), name: '김하은', phone: '', memo: '운영자', status: 'active', joinedAt: '2026-05-01' },
    { id: crypto.randomUUID(), name: '이서연', phone: '', memo: '', status: 'active', joinedAt: '2026-05-01' },
    { id: crypto.randomUUID(), name: '박민준', phone: '', memo: '', status: 'active', joinedAt: '2026-05-01' }
  ],
  meetings: [],
  attendance: []
};

let state = loadState();
bootstrapSampleMeeting();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(initialState);
  try {
    return JSON.parse(saved);
  } catch {
    return structuredClone(initialState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function bootstrapSampleMeeting() {
  if (state.meetings.length > 0 || state.books.length === 0) return;
  state.meetings.push({
    id: crypto.randomUUID(),
    bookId: state.books[0].id,
    title: '1회차 독서모임',
    date: '2026-05-18',
    time: '19:30',
    location: '온라인',
    memo: '1부를 읽고 인상 깊은 문장을 가져옵니다.'
  });
  saveState();
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(date);
}

function getBook(bookId) {
  return state.books.find(book => book.id === bookId);
}

function getMeetingAttendance(meetingId) {
  return state.attendance.filter(item => item.meetingId === meetingId);
}

function render() {
  renderNavigation();
  renderDashboard();
  renderBooks();
  renderMembers();
  renderMeetings();
  renderMeetingBookOptions();
  renderAttendanceSelector();
  renderAttendance();
}

function renderNavigation() {
  const hash = location.hash.replace('#', '') || 'dashboard';
  document.querySelectorAll('.view').forEach(view => {
    view.classList.toggle('active', view.dataset.view === hash);
  });
  document.querySelectorAll('[data-nav]').forEach(link => {
    link.classList.toggle('active', link.dataset.nav === hash);
  });
}

function renderDashboard() {
  const currentBook = state.books.find(book => book.status === 'reading') || state.books[0];
  const sortedMeetings = [...state.meetings].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  const nextMeeting = sortedMeetings.find(meeting => new Date(`${meeting.date}T${meeting.time}`) >= new Date()) || sortedMeetings[0];

  const currentBookPanel = document.querySelector('#currentBookPanel');
  const nextMeetingPanel = document.querySelector('#nextMeetingPanel');
  const attendancePanel = document.querySelector('#attendancePanel');

  if (currentBook) {
    currentBookPanel.innerHTML = `
      <div>
        ${currentBook.coverImage ? `<img src="${escapeHtml(currentBook.coverImage)}" alt="${escapeHtml(currentBook.title)} 표지" />` : `<div class="book-placeholder">${escapeHtml(currentBook.title)}</div>`}
        <p class="panel-meta">현재 읽는 책</p>
        <h2>${escapeHtml(currentBook.title)}</h2>
        <p class="card-body">${escapeHtml(currentBook.author)}</p>
      </div>
      <p class="card-meta">${formatDate(currentBook.startDate)} - ${formatDate(currentBook.endDate)}</p>
    `;
  } else {
    currentBookPanel.innerHTML = `<div><p class="panel-meta">현재 읽는 책</p><h2>등록된 책이 없어요</h2></div>`;
  }

  if (nextMeeting) {
    const attendance = getMeetingAttendance(nextMeeting.id);
    const attendCount = attendance.filter(item => item.status === 'attend').length;
    nextMeetingPanel.innerHTML = `
      <div>
        <p class="panel-meta">다음 모임</p>
        <h2>${escapeHtml(nextMeeting.title)}</h2>
        <p class="card-body">${formatDate(nextMeeting.date)} ${nextMeeting.time}</p>
        <p class="card-meta">${escapeHtml(nextMeeting.location || '장소 미정')}</p>
      </div>
      <p class="card-meta">참석 예정 ${attendCount}명 / 전체 ${state.members.length}명</p>
    `;
  } else {
    nextMeetingPanel.innerHTML = `<div><p class="panel-meta">다음 모임</p><h2>등록된 일정이 없어요</h2></div>`;
  }

  const totalMembers = state.members.length;
  const activeMembers = state.members.filter(member => member.status === 'active').length;
  attendancePanel.innerHTML = `
    <div>
      <p class="panel-meta">멤버 현황</p>
      <div class="panel-number">${activeMembers}</div>
      <p class="card-body">활동 중인 멤버</p>
    </div>
    <p class="card-meta">전체 ${totalMembers}명</p>
  `;
}

function renderBooks() {
  const container = document.querySelector('#bookList');
  if (state.books.length === 0) {
    container.innerHTML = `<div class="empty-state">아직 등록된 책이 없어요.</div>`;
    return;
  }
  container.innerHTML = state.books.map(book => `
    <article class="book-card">
      ${book.coverImage ? `<img class="book-cover" src="${escapeHtml(book.coverImage)}" alt="${escapeHtml(book.title)} 표지" />` : `<div class="book-placeholder">${escapeHtml(book.title)}</div>`}
      <div>
        <h2 class="card-title">${escapeHtml(book.title)}</h2>
        <p class="card-body">${escapeHtml(book.author)}</p>
        <p class="card-meta">${book.status === 'reading' ? '읽는 중' : '완료'} · ${formatDate(book.startDate)} - ${formatDate(book.endDate)}</p>
      </div>
      <div class="card-actions">
        <button class="btn btn-secondary" onclick="editBook('${book.id}')">수정</button>
        <button class="btn btn-secondary status-danger" onclick="deleteBook('${book.id}')">삭제</button>
      </div>
    </article>
  `).join('');
}

function renderMembers() {
  const container = document.querySelector('#memberList');
  if (state.members.length === 0) {
    container.innerHTML = `<div class="empty-state">아직 등록된 멤버가 없어요.</div>`;
    return;
  }
  container.innerHTML = state.members.map(member => `
    <div class="list-row">
      <div>
        <p class="row-title">${escapeHtml(member.name)}</p>
        <p class="row-sub">${escapeHtml(member.phone || '연락처 없음')} · ${member.status === 'active' ? '활동 중' : '비활성'} · ${member.joinedAt}</p>
      </div>
      <div class="row-actions">
        <button class="btn btn-secondary" onclick="editMember('${member.id}')">수정</button>
        <button class="btn btn-secondary status-danger" onclick="deleteMember('${member.id}')">삭제</button>
      </div>
    </div>
  `).join('');
}

function renderMeetings() {
  const container = document.querySelector('#meetingList');
  if (state.meetings.length === 0) {
    container.innerHTML = `<div class="empty-state">아직 등록된 일정이 없어요.</div>`;
    return;
  }
  const meetings = [...state.meetings].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  container.innerHTML = meetings.map(meeting => {
    const book = getBook(meeting.bookId);
    const attendance = getMeetingAttendance(meeting.id);
    const attendCount = attendance.filter(item => item.status === 'attend').length;
    return `
      <div class="list-row">
        <div>
          <p class="row-title">${escapeHtml(meeting.title)}</p>
          <p class="row-sub">${formatDate(meeting.date)} ${meeting.time} · ${escapeHtml(meeting.location || '장소 미정')} · ${escapeHtml(book?.title || '책 없음')}</p>
          <p class="row-sub">참석 ${attendCount}명 / 전체 ${state.members.length}명</p>
        </div>
        <div class="row-actions">
          <button class="btn btn-secondary" onclick="editMeeting('${meeting.id}')">수정</button>
          <button class="btn btn-secondary status-danger" onclick="deleteMeeting('${meeting.id}')">삭제</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderMeetingBookOptions() {
  const select = document.querySelector('#meetingBookSelect');
  select.innerHTML = state.books.length
    ? state.books.map(book => `<option value="${book.id}">${escapeHtml(book.title)}</option>`).join('')
    : `<option value="" disabled selected>먼저 책을 등록하세요</option>`;
}

function renderAttendanceSelector() {
  const select = document.querySelector('#attendanceMeetingSelect');
  if (state.meetings.length === 0) {
    select.innerHTML = `<option value="">등록된 일정이 없어요</option>`;
    return;
  }
  const currentValue = select.value;
  select.innerHTML = state.meetings.map(meeting => `<option value="${meeting.id}">${formatDate(meeting.date)} · ${escapeHtml(meeting.title)}</option>`).join('');
  if (currentValue && state.meetings.some(meeting => meeting.id === currentValue)) {
    select.value = currentValue;
  }
}

function renderAttendance() {
  const container = document.querySelector('#attendanceList');
  const select = document.querySelector('#attendanceMeetingSelect');
  const meetingId = select.value || state.meetings[0]?.id;

  if (!meetingId) {
    container.innerHTML = `<div class="empty-state">참여 여부를 확인할 일정이 없어요.</div>`;
    return;
  }
  if (state.members.length === 0) {
    container.innerHTML = `<div class="empty-state">참여 여부를 확인할 멤버가 없어요.</div>`;
    return;
  }

  container.innerHTML = state.members.map(member => {
    const record = state.attendance.find(item => item.meetingId === meetingId && item.memberId === member.id);
    const status = record?.status || 'pending';
    return `
      <div class="list-row">
        <div>
          <p class="row-title">${escapeHtml(member.name)}</p>
          <p class="row-sub">현재 상태: ${statusLabel(status)}</p>
        </div>
        <div class="attendance-controls">
          <button class="${status === 'attend' ? 'active' : ''}" onclick="setAttendance('${meetingId}', '${member.id}', 'attend')">참석</button>
          <button class="${status === 'absent' ? 'active' : ''}" onclick="setAttendance('${meetingId}', '${member.id}', 'absent')">불참</button>
          <button class="${status === 'pending' ? 'active' : ''}" onclick="setAttendance('${meetingId}', '${member.id}', 'pending')">미정</button>
        </div>
      </div>
    `;
  }).join('');
}

function statusLabel(status) {
  return { attend: '참석', absent: '불참', pending: '미정' }[status] || '미정';
}

function upsertAttendance(meetingId, memberId, status) {
  const existing = state.attendance.find(item => item.meetingId === meetingId && item.memberId === memberId);
  if (existing) {
    existing.status = status;
  } else {
    state.attendance.push({ id: crypto.randomUUID(), meetingId, memberId, status });
  }
}

window.setAttendance = function(meetingId, memberId, status) {
  upsertAttendance(meetingId, memberId, status);
  saveState();
  render();
};

function setupModalTriggers() {
  document.querySelectorAll('[data-open-modal]').forEach(button => {
    button.addEventListener('click', () => {
      const modalId = button.dataset.openModal;
      const modal = document.querySelector(`#${modalId}`);
      if (modalId === 'bookModal') resetBookForm();
      if (modalId === 'memberModal') resetMemberForm();
      if (modalId === 'meetingModal') resetMeetingForm();
      modal.showModal();
    });
  });
  document.querySelectorAll('[data-close-modal]').forEach(button => {
    button.addEventListener('click', () => document.querySelector(`#${button.dataset.closeModal}`).close());
  });
}

function resetBookForm() {
  const form = document.querySelector('#bookForm');
  form.reset();
  form.elements.id.value = '';
  form.elements.status.value = 'reading';
}

function resetMemberForm() {
  const form = document.querySelector('#memberForm');
  form.reset();
  form.elements.id.value = '';
  form.elements.status.value = 'active';
}

function resetMeetingForm() {
  const form = document.querySelector('#meetingForm');
  form.reset();
  form.elements.id.value = '';
  renderMeetingBookOptions();
}

function setupForms() {
  document.querySelector('#bookForm').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = Object.fromEntries(new FormData(form).entries());
    if (formData.id) {
      const book = state.books.find(item => item.id === formData.id);
      Object.assign(book, formData);
    } else {
      state.books.push({ ...formData, id: crypto.randomUUID() });
    }
    saveState();
    document.querySelector('#bookModal').close();
    render();
  });

  document.querySelector('#memberForm').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = Object.fromEntries(new FormData(form).entries());
    if (formData.id) {
      const member = state.members.find(item => item.id === formData.id);
      Object.assign(member, formData);
    } else {
      state.members.push({ ...formData, id: crypto.randomUUID(), joinedAt: new Date().toISOString().slice(0, 10) });
    }
    saveState();
    document.querySelector('#memberModal').close();
    render();
  });

  document.querySelector('#meetingForm').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = Object.fromEntries(new FormData(form).entries());
    if (formData.id) {
      const meeting = state.meetings.find(item => item.id === formData.id);
      Object.assign(meeting, formData);
    } else {
      state.meetings.push({ ...formData, id: crypto.randomUUID() });
    }
    saveState();
    document.querySelector('#meetingModal').close();
    render();
  });

  document.querySelector('#attendanceMeetingSelect').addEventListener('change', renderAttendance);
}

window.editBook = function(id) {
  const book = state.books.find(item => item.id === id);
  if (!book) return;
  const form = document.querySelector('#bookForm');
  resetBookForm();
  Object.entries(book).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value || '';
  });
  document.querySelector('#bookModal').showModal();
};

window.deleteBook = function(id) {
  if (!confirm('이 책을 삭제할까요? 관련 일정도 함께 삭제됩니다.')) return;
  const meetingIds = state.meetings.filter(meeting => meeting.bookId === id).map(meeting => meeting.id);
  state.books = state.books.filter(book => book.id !== id);
  state.meetings = state.meetings.filter(meeting => meeting.bookId !== id);
  state.attendance = state.attendance.filter(item => !meetingIds.includes(item.meetingId));
  saveState();
  render();
};

window.editMember = function(id) {
  const member = state.members.find(item => item.id === id);
  if (!member) return;
  const form = document.querySelector('#memberForm');
  resetMemberForm();
  Object.entries(member).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value || '';
  });
  document.querySelector('#memberModal').showModal();
};

window.deleteMember = function(id) {
  if (!confirm('이 멤버를 삭제할까요? 참석 기록도 함께 삭제됩니다.')) return;
  state.members = state.members.filter(member => member.id !== id);
  state.attendance = state.attendance.filter(item => item.memberId !== id);
  saveState();
  render();
};

window.editMeeting = function(id) {
  const meeting = state.meetings.find(item => item.id === id);
  if (!meeting) return;
  const form = document.querySelector('#meetingForm');
  resetMeetingForm();
  Object.entries(meeting).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value || '';
  });
  document.querySelector('#meetingModal').showModal();
};

window.deleteMeeting = function(id) {
  if (!confirm('이 일정을 삭제할까요? 참석 기록도 함께 삭제됩니다.')) return;
  state.meetings = state.meetings.filter(meeting => meeting.id !== id);
  state.attendance = state.attendance.filter(item => item.meetingId !== id);
  saveState();
  render();
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

window.addEventListener('hashchange', renderNavigation);
setupModalTriggers();
setupForms();
render();

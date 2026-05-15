const config = window.BOOK_STUDY_CONFIG || {};
const hasSupabaseConfig = Boolean(
  config.SUPABASE_URL &&
  config.SUPABASE_ANON_KEY &&
  !config.SUPABASE_URL.includes('YOUR_PROJECT_ID') &&
  !config.SUPABASE_ANON_KEY.includes('YOUR_SUPABASE')
);

const db = hasSupabaseConfig
  ? window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)
  : null;

let state = {
  books: [],
  members: [],
  meetings: [],
  attendance: []
};

let currentUser = null;

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

init();

async function init() {
  bindEvents();
  showConfigWarningIfNeeded();

  if (!db) {
    showAuth();
    return;
  }

  const { data } = await db.auth.getSession();
  if (data?.session?.user) {
    currentUser = data.session.user;
    await enterApp();
  } else {
    showAuth();
  }
}

function bindEvents() {
  window.addEventListener('hashchange', renderNavigation);

  $('#loginForm')?.addEventListener('submit', handleLogin);
  $('#logoutButton')?.addEventListener('click', handleLogout);

  $$('[data-open-modal]').forEach(button => {
    button.addEventListener('click', () => openCreateModal(button.dataset.openModal));
  });

  $$('[data-close-modal]').forEach(button => {
    button.addEventListener('click', () => closeModal(button.dataset.closeModal));
  });

  $('#bookForm')?.addEventListener('submit', handleBookSubmit);
  $('#memberForm')?.addEventListener('submit', handleMemberSubmit);
  $('#meetingForm')?.addEventListener('submit', handleMeetingSubmit);
  $('#attendanceMeetingSelect')?.addEventListener('change', renderAttendance);
}

function showConfigWarningIfNeeded() {
  const warning = $('#configWarning');
  if (warning) warning.hidden = hasSupabaseConfig;
}

async function handleLogin(event) {
  event.preventDefault();
  if (!db) return setAuthMessage('config.js 설정이 필요합니다.');

  const form = event.currentTarget;
  const email = form.email.value.trim();
  const password = form.password.value;

  setAuthMessage('로그인 중입니다.');
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    setAuthMessage(`로그인 실패: ${error.message}`);
    return;
  }

  currentUser = data.user;
  setAuthMessage('');
  await enterApp();
}

async function handleLogout() {
  if (!db) return;
  await db.auth.signOut();
  currentUser = null;
  state = { books: [], members: [], meetings: [], attendance: [] };
  showAuth();
}

async function enterApp() {
  showLoading(true);
  try {
    await loadAll();
    $('#authScreen').hidden = true;
    $('#appShell').hidden = false;
    showLoading(false);
    render();
  } catch (error) {
    showLoading(false);
    showAuth();
    setAuthMessage(`데이터 로딩 실패: ${error.message}`);
  }
}

function showAuth() {
  $('#authScreen').hidden = false;
  $('#appShell').hidden = true;
  showLoading(false);
}

function showLoading(visible) {
  const loading = $('#loadingScreen');
  if (loading) loading.hidden = !visible;
}

function setAuthMessage(message) {
  const target = $('#authMessage');
  if (target) target.textContent = message;
}

async function loadAll() {
  const [books, members, meetings, attendance] = await Promise.all([
    selectTable('books', 'created_at', true),
    selectTable('members', 'name', false),
    selectTable('meetings', 'meeting_date', false),
    selectTable('attendance', 'created_at', true)
  ]);

  state.books = books.map(mapBookFromDb);
  state.members = members.map(mapMemberFromDb);
  state.meetings = meetings.map(mapMeetingFromDb);
  state.attendance = attendance.map(mapAttendanceFromDb);
}

async function selectTable(table, orderColumn, ascending) {
  const { data, error } = await db
    .from(table)
    .select('*')
    .order(orderColumn, { ascending });
  if (error) throw error;
  return data || [];
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
  $$('.view').forEach(view => view.classList.toggle('active', view.dataset.view === hash));
  $$('[data-nav]').forEach(link => link.classList.toggle('active', link.dataset.nav === hash));
}

function renderDashboard() {
  const currentBook = state.books.find(book => book.status === 'reading') || state.books[0];
  const sortedMeetings = [...state.meetings].sort((a, b) => `${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`));
  const now = new Date();
  const nextMeeting = sortedMeetings.find(meeting => new Date(`${meeting.date}T${meeting.time || '00:00'}`) >= now) || sortedMeetings[0];

  const currentBookPanel = $('#currentBookPanel');
  const nextMeetingPanel = $('#nextMeetingPanel');
  const attendancePanel = $('#attendancePanel');

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
        <p class="card-body">${formatDate(nextMeeting.date)} ${nextMeeting.time || ''}</p>
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
  const container = $('#bookList');
  if (!state.books.length) {
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
  const container = $('#memberList');
  if (!state.members.length) {
    container.innerHTML = `<div class="empty-state">아직 등록된 멤버가 없어요.</div>`;
    return;
  }

  container.innerHTML = state.members.map(member => `
    <div class="list-row">
      <div>
        <p class="row-title">${escapeHtml(member.name)}</p>
        <p class="row-sub">${escapeHtml(member.phone || '연락처 없음')} · ${member.status === 'active' ? '활동 중' : '비활성'} · ${member.joinedAt || '-'}</p>
      </div>
      <div class="row-actions">
        <button class="btn btn-secondary" onclick="editMember('${member.id}')">수정</button>
        <button class="btn btn-secondary status-danger" onclick="deleteMember('${member.id}')">삭제</button>
      </div>
    </div>
  `).join('');
}

function renderMeetings() {
  const container = $('#meetingList');
  if (!state.meetings.length) {
    container.innerHTML = `<div class="empty-state">아직 등록된 일정이 없어요.</div>`;
    return;
  }

  const meetings = [...state.meetings].sort((a, b) => `${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`));
  container.innerHTML = meetings.map(meeting => {
    const book = getBook(meeting.bookId);
    const attendance = getMeetingAttendance(meeting.id);
    const attendCount = attendance.filter(item => item.status === 'attend').length;
    return `
      <div class="list-row">
        <div>
          <p class="row-title">${escapeHtml(meeting.title)}</p>
          <p class="row-sub">${formatDate(meeting.date)} ${meeting.time || ''} · ${escapeHtml(meeting.location || '장소 미정')} · ${escapeHtml(book?.title || '책 없음')}</p>
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
  const select = $('#meetingBookSelect');
  if (!select) return;
  select.innerHTML = state.books.length
    ? state.books.map(book => `<option value="${book.id}">${escapeHtml(book.title)}</option>`).join('')
    : `<option value="" disabled selected>먼저 책을 등록하세요</option>`;
}

function renderAttendanceSelector() {
  const select = $('#attendanceMeetingSelect');
  if (!select) return;

  if (!state.meetings.length) {
    select.innerHTML = `<option value="">등록된 일정이 없어요</option>`;
    return;
  }

  const currentValue = select.value;
  select.innerHTML = state.meetings
    .sort((a, b) => `${a.date}T${a.time || '00:00'}`.localeCompare(`${b.date}T${b.time || '00:00'}`))
    .map(meeting => `<option value="${meeting.id}">${formatDate(meeting.date)} · ${escapeHtml(meeting.title)}</option>`)
    .join('');

  if (currentValue && state.meetings.some(meeting => meeting.id === currentValue)) select.value = currentValue;
}

function renderAttendance() {
  const container = $('#attendanceList');
  const select = $('#attendanceMeetingSelect');
  if (!container || !select) return;

  const meetingId = select.value;
  if (!meetingId || !state.members.length) {
    container.innerHTML = `<div class="empty-state">참석을 체크할 일정 또는 멤버가 없어요.</div>`;
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

async function handleBookSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = {
    title: form.title.value.trim(),
    author: form.author.value.trim(),
    cover_image: form.coverImage.value.trim() || null,
    start_date: form.startDate.value || null,
    end_date: form.endDate.value || null,
    status: form.status.value,
    memo: form.memo.value.trim() || null
  };

  if (!payload.title || !payload.author) return alert('책 제목과 저자는 필수입니다.');
  await upsertRow('books', form.id.value, payload);
  closeModal('bookModal');
  await refreshAndRender();
}

async function handleMemberSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = {
    name: form.name.value.trim(),
    phone: form.phone.value.trim() || null,
    status: form.status.value,
    joined_at: form.joinedAt.value || new Date().toISOString().slice(0, 10),
    memo: form.memo.value.trim() || null
  };

  if (!payload.name) return alert('이름은 필수입니다.');
  await upsertRow('members', form.id.value, payload);
  closeModal('memberModal');
  await refreshAndRender();
}

async function handleMeetingSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const payload = {
    book_id: form.bookId.value || null,
    title: form.title.value.trim(),
    meeting_date: form.date.value,
    meeting_time: form.time.value || null,
    location: form.location.value.trim() || null,
    memo: form.memo.value.trim() || null
  };

  if (!payload.title || !payload.meeting_date) return alert('모임 제목과 날짜는 필수입니다.');
  await upsertRow('meetings', form.id.value, payload);
  closeModal('meetingModal');
  await refreshAndRender();
}

async function upsertRow(table, id, payload) {
  let query;
  if (id) {
    query = db.from(table).update(payload).eq('id', id).select().single();
  } else {
    query = db.from(table).insert(payload).select().single();
  }
  const { error } = await query;
  if (error) throwAndAlert(error);
}

async function deleteRow(table, id) {
  const { error } = await db.from(table).delete().eq('id', id);
  if (error) throwAndAlert(error);
}

async function refreshAndRender() {
  await loadAll();
  render();
}

window.editBook = function editBook(id) {
  const book = state.books.find(item => item.id === id);
  if (!book) return;
  const form = $('#bookForm');
  form.id.value = book.id;
  form.title.value = book.title;
  form.author.value = book.author;
  form.coverImage.value = book.coverImage || '';
  form.startDate.value = book.startDate || '';
  form.endDate.value = book.endDate || '';
  form.status.value = book.status;
  form.memo.value = book.memo || '';
  openModal('bookModal', '책 수정');
};

window.deleteBook = async function deleteBook(id) {
  if (!confirm('이 책을 삭제할까요? 관련 일정의 책 연결이 해제될 수 있습니다.')) return;
  await deleteRow('books', id);
  await refreshAndRender();
};

window.editMember = function editMember(id) {
  const member = state.members.find(item => item.id === id);
  if (!member) return;
  const form = $('#memberForm');
  form.id.value = member.id;
  form.name.value = member.name;
  form.phone.value = member.phone || '';
  form.status.value = member.status;
  form.joinedAt.value = member.joinedAt || '';
  form.memo.value = member.memo || '';
  openModal('memberModal', '멤버 수정');
};

window.deleteMember = async function deleteMember(id) {
  if (!confirm('이 멤버를 삭제할까요? 참석 기록도 함께 삭제됩니다.')) return;
  await deleteRow('members', id);
  await refreshAndRender();
};

window.editMeeting = function editMeeting(id) {
  const meeting = state.meetings.find(item => item.id === id);
  if (!meeting) return;
  const form = $('#meetingForm');
  form.id.value = meeting.id;
  form.bookId.value = meeting.bookId || '';
  form.title.value = meeting.title;
  form.date.value = meeting.date || '';
  form.time.value = meeting.time || '';
  form.location.value = meeting.location || '';
  form.memo.value = meeting.memo || '';
  openModal('meetingModal', '일정 수정');
};

window.deleteMeeting = async function deleteMeeting(id) {
  if (!confirm('이 일정을 삭제할까요? 참석 기록도 함께 삭제됩니다.')) return;
  await deleteRow('meetings', id);
  await refreshAndRender();
};

window.setAttendance = async function setAttendance(meetingId, memberId, status) {
  const existing = state.attendance.find(item => item.meetingId === meetingId && item.memberId === memberId);
  const payload = {
    meeting_id: meetingId,
    member_id: memberId,
    status
  };

  let query;
  if (existing) {
    query = db.from('attendance').update({ status }).eq('id', existing.id).select().single();
  } else {
    query = db.from('attendance').insert(payload).select().single();
  }

  const { error } = await query;
  if (error) throwAndAlert(error);
  await refreshAndRender();
};

function openCreateModal(modalId) {
  if (modalId === 'bookModal') resetBookForm();
  if (modalId === 'memberModal') resetMemberForm();
  if (modalId === 'meetingModal') resetMeetingForm();
  openModal(modalId);
}

function openModal(modalId, title) {
  const modal = $(`#${modalId}`);
  if (!modal) return;
  if (title) modal.querySelector('.modal-header h2').textContent = title;
  modal.showModal();
}

function closeModal(modalId) {
  const modal = $(`#${modalId}`);
  if (modal?.open) modal.close();
}

function resetBookForm() {
  const form = $('#bookForm');
  form.reset();
  form.id.value = '';
  form.status.value = 'reading';
  $('#bookModal .modal-header h2').textContent = '책 등록';
}

function resetMemberForm() {
  const form = $('#memberForm');
  form.reset();
  form.id.value = '';
  form.status.value = 'active';
  form.joinedAt.value = new Date().toISOString().slice(0, 10);
  $('#memberModal .modal-header h2').textContent = '멤버 추가';
}

function resetMeetingForm() {
  const form = $('#meetingForm');
  form.reset();
  form.id.value = '';
  renderMeetingBookOptions();
  $('#meetingModal .modal-header h2').textContent = '일정 추가';
}

function mapBookFromDb(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    coverImage: row.cover_image || '',
    startDate: row.start_date || '',
    endDate: row.end_date || '',
    status: row.status,
    memo: row.memo || ''
  };
}

function mapMemberFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || '',
    memo: row.memo || '',
    status: row.status,
    joinedAt: row.joined_at || ''
  };
}

function mapMeetingFromDb(row) {
  return {
    id: row.id,
    bookId: row.book_id || '',
    title: row.title,
    date: row.meeting_date,
    time: row.meeting_time ? row.meeting_time.slice(0, 5) : '',
    location: row.location || '',
    memo: row.memo || ''
  };
}

function mapAttendanceFromDb(row) {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    memberId: row.member_id,
    status: row.status,
    memo: row.memo || ''
  };
}

function getBook(bookId) {
  return state.books.find(book => book.id === bookId);
}

function getMeetingAttendance(meetingId) {
  return state.attendance.filter(item => item.meetingId === meetingId);
}

function statusLabel(status) {
  return {
    attend: '참석',
    absent: '불참',
    pending: '미정'
  }[status] || '미정';
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(date);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function throwAndAlert(error) {
  alert(`처리 실패: ${error.message}`);
  throw error;
}

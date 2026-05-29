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
          <button class="btn btn-secondary" onclick="openMeetingNotes('${meeting.id}')">🎙️ 회의록/녹음</button>
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
    memo: row.memo || '',
    transcript: row.transcript || '',
    summary: row.summary || ''
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

// ==========================================
// 회의 녹음 및 AI 회의록 관련 전역 변수 및 함수
// ==========================================

let mediaRecorder = null;
let audioChunks = [];
let recordingStartTime = 0;
let recordingInterval = null;
let audioContext = null;
let analyser = null;
let dataArray = null;
let animationFrameId = null;
let recordedBlob = null;

// 모임 회의록/녹음 모달 열기
window.openMeetingNotes = function openMeetingNotes(meetingId) {
  const meeting = state.meetings.find(m => m.id === meetingId);
  if (!meeting) return;

  $('#notesMeetingId').value = meetingId;
  $('#notesModalTitle').textContent = `${escapeHtml(meeting.title)} - 회의록 및 녹음`;

  // 보기 영역 데이터 설정
  $('#notesSummaryView').textContent = meeting.summary || '아직 작성된 요약이 없습니다.';
  $('#notesSummaryView').classList.toggle('placeholder-text', !meeting.summary);
  $('#notesTranscriptView').textContent = meeting.transcript || '아직 전사된 내용이 없습니다.';
  $('#notesTranscriptView').classList.toggle('placeholder-text', !meeting.transcript);

  // 편집 영역 데이터 설정
  $('#notesSummaryEdit').value = meeting.summary || '';
  $('#notesTranscriptEdit').value = meeting.transcript || '';

  // API 키 로드
  const savedKey = localStorage.getItem('gemini_api_key');
  $('#geminiApiKeyInput').value = savedKey || '';

  // 녹음 상태 초기화
  recordedBlob = null;
  audioChunks = [];
  if (recordingInterval) clearInterval(recordingInterval);
  $('#recordingTimer').textContent = '00:00:00';
  $('#recordingStatusText').textContent = '준비 완료';
  $('#recordingStatusDot').classList.remove('active');
  $('#startRecordBtn').disabled = false;
  $('#stopRecordBtn').disabled = true;
  $('#audioPlaybackContainer').hidden = true;
  $('#aiProgressContainer').hidden = true;

  // 비주얼라이저 캔버스 초기 라인 그리기
  setTimeout(() => {
    const canvas = $('#audioVisualizer');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    }
  }, 100);

  switchNotesTab('view');
  openModal('meetingNotesModal');
};

// 탭 전환 처리
window.switchNotesTab = function switchNotesTab(tabId) {
  // 탭 버튼 스타일 전환
  $$('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.id === `tabBtn_${tabId}`);
  });

  // 탭 콘텐츠 숨김/노출 전환
  $('#notesTab_view').hidden = tabId !== 'view';
  $('#notesTab_edit').hidden = tabId !== 'edit';
  $('#notesTab_record').hidden = tabId !== 'record';

  // 보기 탭으로 전환될 때 편집 창의 최신 내용을 동기화
  if (tabId === 'view') {
    const summary = $('#notesSummaryEdit').value.trim();
    const transcript = $('#notesTranscriptEdit').value.trim();
    
    $('#notesSummaryView').textContent = summary || '아직 작성된 요약이 없습니다.';
    $('#notesSummaryView').classList.toggle('placeholder-text', !summary);
    $('#notesTranscriptView').textContent = transcript || '아직 전사된 내용이 없습니다.';
    $('#notesTranscriptView').classList.toggle('placeholder-text', !transcript);
  }
};

// Gemini API Key 로컬 저장
window.saveGeminiApiKey = function saveGeminiApiKey() {
  const key = $('#geminiApiKeyInput').value.trim();
  if (key) {
    localStorage.setItem('gemini_api_key', key);
    alert('Gemini API 키가 로컬 저장소에 저장되었습니다.');
  } else {
    localStorage.removeItem('gemini_api_key');
    alert('Gemini API 키가 삭제되었습니다.');
  }
};

// 녹음 타이머 업데이트
function updateTimer() {
  const elapsed = Date.now() - recordingStartTime;
  const seconds = Math.floor((elapsed / 1000) % 60);
  const minutes = Math.floor((elapsed / (1000 * 60)) % 60);
  const hours = Math.floor(elapsed / (1000 * 60 * 60));

  const pad = num => String(num).padStart(2, '0');
  const timerText = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  const timerElement = $('#recordingTimer');
  if (timerElement) timerElement.textContent = timerText;
}

// 실시간 오디오 비주얼라이저 드로잉 루프
function drawVisualizer() {
  const canvas = $('#audioVisualizer');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  animationFrameId = requestAnimationFrame(drawVisualizer);

  if (!analyser) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    return;
  }

  const bufferLength = analyser.frequencyBinCount;
  analyser.getByteTimeDomainData(dataArray);

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);
  
  // 파형 그리기 (빨간색 라인)
  ctx.strokeStyle = '#ff003c';
  ctx.lineWidth = 3;
  ctx.beginPath();

  const sliceWidth = width * 1.0 / bufferLength;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] / 128.0;
    const y = v * height / 2;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }

    x += sliceWidth;
  }

  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();
}

// 녹음 시작
window.startRecording = async function startRecording() {
  recordedBlob = null;
  audioChunks = [];
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // 호환 가능한 코덱 확인 및 저비트레이트 설정 (AI 최적화)
    let options = {};
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      options = { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 24000 };
    } else if (MediaRecorder.isTypeSupported('audio/webm')) {
      options = { mimeType: 'audio/webm', audioBitsPerSecond: 24000 };
    } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
      options = { mimeType: 'audio/ogg', audioBitsPerSecond: 24000 };
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      options = { mimeType: 'audio/mp4', audioBitsPerSecond: 24000 };
    }

    mediaRecorder = new MediaRecorder(stream, options);
    
    // 비주얼라이저 구현을 위한 AudioContext 세팅
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    mediaRecorder.ondataavailable = event => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      // 녹음 완료 처리 및 플레이어 연결
      recordedBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
      const audioUrl = URL.createObjectURL(recordedBlob);
      const player = $('#meetingAudioPlayer');
      if (player) player.src = audioUrl;
      
      $('#audioPlaybackContainer').hidden = false;

      // 비주얼라이저 중지 및 컨텍스트 정리
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      analyser = null;
      if (audioContext) {
        audioContext.close();
        audioContext = null;
      }
      
      // 캔버스 초기화
      const canvas = $('#audioVisualizer');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
      }
    };

    mediaRecorder.start();
    
    // 타이머 및 시각화 활성화
    recordingStartTime = Date.now();
    recordingInterval = setInterval(updateTimer, 1000);
    drawVisualizer();

    // UI 변경
    $('#startRecordBtn').disabled = true;
    $('#stopRecordBtn').disabled = false;
    $('#recordingStatusDot').classList.add('active');
    $('#recordingStatusText').textContent = '녹음 중...';
    $('#audioPlaybackContainer').hidden = true;
  } catch (error) {
    alert(`마이크 권한 획득 또는 녹음 시작 실패: ${error.message}`);
  }
};

// 녹음 중지
window.stopRecording = function stopRecording() {
  if (!mediaRecorder || mediaRecorder.state === 'inactive') return;

  mediaRecorder.stop();
  mediaRecorder.stream.getTracks().forEach(track => track.stop());

  if (recordingInterval) clearInterval(recordingInterval);

  $('#startRecordBtn').disabled = false;
  $('#stopRecordBtn').disabled = true;
  $('#recordingStatusDot').classList.remove('active');
  $('#recordingStatusText').textContent = '녹음 완료';
};

// 음성 다운로드
window.downloadAudioFile = function downloadAudioFile() {
  if (!recordedBlob) return alert('녹음된 오디오가 없습니다.');
  const meetingId = $('#notesMeetingId').value;
  const meeting = state.meetings.find(m => m.id === meetingId);
  const extension = recordedBlob.type.includes('mp4') ? 'mp4' : 'webm';
  const fileName = `recording_${meeting ? meeting.title.replace(/\s+/g, '_') : 'meeting'}.${extension}`;
  
  const a = document.createElement('a');
  a.href = URL.createObjectURL(recordedBlob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

// AI 회의록 생성 및 파싱
window.generateAiNotes = async function generateAiNotes() {
  const apiKey = localStorage.getItem('gemini_api_key');
  if (!apiKey) return alert('먼저 Gemini API 키를 입력하고 저장해 주세요.');
  if (!recordedBlob) return alert('녹음 데이터가 존재하지 않습니다. 먼저 녹음을 진행하세요.');

  $('#aiProgressContainer').hidden = false;
  $('#generateAiNotesBtn').disabled = true;

  try {
    const base64Audio = await blobToBase64(recordedBlob);
    const mimeType = recordedBlob.type;

    const text = await callGeminiAPI(apiKey, base64Audio, mimeType);
    
    // AI 응답 마크다운 헤더로 파싱 분할
    let transcript = '';
    let summary = '';

    const transcriptMarker = '# [전사 결과]';
    const summaryMarker = '# [요약 및 정리]';

    const tIndex = text.indexOf(transcriptMarker);
    const sIndex = text.indexOf(summaryMarker);

    if (tIndex !== -1 && sIndex !== -1) {
      if (tIndex < sIndex) {
        transcript = text.slice(tIndex + transcriptMarker.length, sIndex).trim();
        summary = text.slice(sIndex + summaryMarker.length).trim();
      } else {
        summary = text.slice(sIndex + summaryMarker.length, tIndex).trim();
        transcript = text.slice(tIndex + transcriptMarker.length).trim();
      }
    } else {
      summary = text;
      transcript = '텍스트 분리에 실패하여 전체 내용을 요약 본문에 로드합니다.';
    }

    // 입력 폼 바인딩
    $('#notesSummaryEdit').value = summary;
    $('#notesTranscriptEdit').value = transcript;

    // 편집 탭으로 화면 전환하여 수정 기회 제공
    switchNotesTab('edit');
    alert('AI 분석 및 요약이 임시 저장되었습니다! 내용을 검토하고 아래 [회의록 저장] 버튼을 눌러 확정해 주세요.');
  } catch (error) {
    alert(`AI 회의록 생성 중 오류가 발생했습니다: ${error.message}`);
  } finally {
    $('#aiProgressContainer').hidden = true;
    $('#generateAiNotesBtn').disabled = false;
  }
};

// Blob -> Base64 변환 유틸 함수
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Gemini API 연동 fetch 요청
async function callGeminiAPI(apiKey, audioBase64, mimeType) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [
          {
            text: "이 오디오는 북 스터디 모임의 녹음 파일입니다.\n\n" +
                  "다음 두 가지 작업을 수행해 주세요:\n" +
                  "1. 전사(Transcript): 대화 내용을 가능한 한 상세하게 한글로 전사해 주세요.\n" +
                  "2. 요약 및 정리(Summary): 주요 논의 주제, 책에 대한 의견, 결정된 사항, 다음 모임 계획 등을 구조화된 마크다운 형식으로 보기 좋게 정리해 주세요.\n\n" +
                  "출력 형식은 반드시 아래의 마크다운 헤더로 시작하도록 나누어 작성해 주세요. 다른 서론이나 꼬리말은 넣지 마세요:\n" +
                  "# [전사 결과]\n(여기에 전사된 내용을 상세히 적어주세요)\n\n# [요약 및 정리]\n(여기에 구조화되고 깔끔한 회의 요약을 적어주세요)"
          },
          {
            inlineData: {
              mimeType: mimeType,
              data: audioBase64
            }
          }
        ]
      }]
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Gemini API 호출 중 서버가 에러를 반환했습니다.');
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// DB에 전사 및 요약본 영구 저장
window.saveMeetingNotes = async function saveMeetingNotes() {
  const meetingId = $('#notesMeetingId').value;
  if (!meetingId) return;

  const summary = $('#notesSummaryEdit').value.trim();
  const transcript = $('#notesTranscriptEdit').value.trim();

  try {
    const { error } = await db
      .from('meetings')
      .update({
        summary: summary || null,
        transcript: transcript || null
      })
      .eq('id', meetingId);

    if (error) throw error;

    // 로컬 상태 동기화
    const meeting = state.meetings.find(m => m.id === meetingId);
    if (meeting) {
      meeting.summary = summary;
      meeting.transcript = transcript;
    }

    // 뷰 내용 변경
    $('#notesSummaryView').textContent = summary || '아직 작성된 요약이 없습니다.';
    $('#notesSummaryView').classList.toggle('placeholder-text', !summary);
    $('#notesTranscriptView').textContent = transcript || '아직 전사된 내용이 없습니다.';
    $('#notesTranscriptView').classList.toggle('placeholder-text', !transcript);

    switchNotesTab('view');
    alert('회의록이 데이터베이스에 저장되었습니다.');
    await refreshAndRender();
  } catch (error) {
    alert(`회의록 저장 실패: ${error.message}`);
  }
};


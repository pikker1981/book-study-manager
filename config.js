// Supabase 및 공용 비밀번호 설정 파일
// 1) Supabase Dashboard > Project Settings > API에서 Project URL과 publishable/anon key를 복사하세요.
// 2) 아래 값을 교체하세요.
// 3) APP_PASSWORD는 접속 시 입력할 공용 비밀번호입니다. 원하는 값으로 바꾸세요.
// 4) 이 파일은 브라우저에 노출됩니다. service_role/secret key는 절대 넣지 마세요.
// 5) 이 비밀번호 잠금은 간단한 접근 제한용입니다. 강한 보안이 필요하면 Supabase Auth를 사용하세요.

window.BOOK_STUDY_CONFIG = {
  SUPABASE_URL: 'https://YOUR_PROJECT_ID.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY',
  APP_PASSWORD: 'bookstudy'
};

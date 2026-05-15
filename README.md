# Book Study Manager - Password Edit Version

소규모 독서모임 운영자가 책, 멤버, 일정, 참석 여부를 관리하는 정적 웹앱입니다.

## 특징

- Supabase DB 연동
- PC/모바일 데이터 동기화
- 회원가입/로그인 없음
- 접속 시 공용 비밀번호 1개 입력
- 책 등록/수정/삭제
- 멤버 추가/수정/삭제
- 일정 추가/수정/삭제
- 일정별 참석/불참/미정 체크

## 세팅 순서

1. Supabase 프로젝트를 생성합니다.
2. `supabase/schema.sql` 내용을 Supabase SQL Editor에서 실행합니다.
3. `config.js`에 Supabase URL과 publishable/anon key를 입력합니다.
4. `config.js`의 `APP_PASSWORD` 값을 원하는 공용 비밀번호로 변경합니다.
5. 전체 파일을 GitHub Pages, Netlify, Vercel, Cloudflare Pages 등에 배포합니다.

## config.js 예시

```js
window.BOOK_STUDY_CONFIG = {
  SUPABASE_URL: 'https://xxxxx.supabase.co',
  SUPABASE_ANON_KEY: 'your-publishable-or-anon-key',
  APP_PASSWORD: '원하는비밀번호'
};
```

## 보안 주의

이 방식은 간단한 접근 제한입니다. `config.js`는 브라우저에 노출되므로 개발자 도구를 열면 비밀번호를 확인할 수 있습니다.
실제 운영에서 강한 보안이 필요하면 Supabase Auth 방식으로 전환해야 합니다.

또한 `service_role` 또는 `secret key`는 절대 `config.js`에 넣으면 안 됩니다.

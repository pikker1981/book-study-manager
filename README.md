# Book Study Manager - Supabase Version

소규모 북 스터디 모임을 관리하는 정적 웹앱입니다.
이 버전은 `localStorage`가 아니라 Supabase DB에 데이터를 저장합니다.
따라서 PC에서 수정한 책/멤버/일정/참석 정보가 모바일에서도 같은 데이터로 보입니다.

## 기능

- 관리자 로그인
- 책 등록 / 수정 / 삭제
- 멤버 추가 / 수정 / 삭제
- 모임 일정 추가 / 수정 / 삭제
- 일정별 참석 / 불참 / 미정 체크
- 대시보드 요약

## 파일 구조

```txt
book-study-manager-supabase/
├─ index.html
├─ style.css
├─ script.js
├─ config.js
├─ README.md
├─ docs/
│  └─ structure.md
└─ supabase/
   └─ schema.sql
```

## Supabase 세팅 순서

### 1. Supabase 프로젝트 생성

Supabase에서 새 프로젝트를 생성합니다.

### 2. 관리자 계정 생성

Supabase Dashboard에서 Auth > Users 메뉴로 이동해 관리자 이메일 계정을 생성합니다.
이 앱은 회원가입 화면을 제공하지 않습니다. 운영자 1명이 로그인해서 수정하는 구조입니다.

권장:
- Auth > Providers > Email 활성화
- 공개 회원가입은 끄는 것을 권장
- 관리자 계정은 Supabase Dashboard에서 직접 생성

### 3. DB 테이블 생성

`supabase/schema.sql` 파일을 열고 아래 문자열을 실제 관리자 이메일로 바꿉니다.

```sql
ADMIN_EMAIL
```

예:

```sql
auth.jwt() ->> 'email' = 'myname@gmail.com'
```

그 다음 Supabase Dashboard > SQL Editor에서 전체 SQL을 실행합니다.

### 4. config.js 수정

`config.js`에서 아래 값을 교체합니다.

```js
window.BOOK_STUDY_CONFIG = {
  SUPABASE_URL: 'https://YOUR_PROJECT_ID.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY',
  ADMIN_EMAIL: 'your-email@example.com'
};
```

값 위치:
- Project Settings > API > Project URL
- Project Settings > API > anon/public key 또는 publishable key

주의:
- `service_role` 또는 secret key는 절대 브라우저 코드에 넣지 마세요.
- 브라우저에는 anon/public/publishable key만 넣어야 합니다.
- RLS 정책이 없으면 데이터가 노출될 수 있습니다.

### 5. 배포

정적 파일 그대로 GitHub Pages, Netlify, Vercel 등에 올릴 수 있습니다.

배포 포함 파일:

```txt
index.html
style.css
script.js
config.js
docs/structure.md
supabase/schema.sql
```

## 기존 localStorage 버전과 차이

기존 버전:

```txt
PC 브라우저 localStorage에만 저장
→ 모바일과 데이터 공유 불가
```

Supabase 버전:

```txt
PC에서 수정
→ Supabase DB 저장
→ 모바일에서 같은 주소 접속
→ 같은 DB 데이터 조회
```

## 보안 메모

이 앱은 서버 없이 Supabase 클라이언트를 브라우저에서 직접 호출합니다.
이 방식은 Supabase에서 일반적으로 지원되는 방식이지만, 반드시 RLS 정책이 제대로 설정되어야 합니다.
`schema.sql`은 관리자 이메일 1개만 읽기/쓰기 가능하도록 정책을 포함합니다.

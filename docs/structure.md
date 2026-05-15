# Book Study Manager 구조

## 목적

복잡한 커뮤니티 앱이 아니라, 운영자 1명이 북 스터디 모임을 간단히 관리하는 앱입니다.

## 핵심 기능

```txt
1. 읽을 책 등록
2. 멤버 추가 / 삭제
3. 모임 일정 추가 / 수정
4. 일정별 참여 여부 확인
```

## 화면 구조

```txt
Dashboard
├─ 현재 읽는 책
├─ 다음 모임
├─ 멤버 현황
└─ 빠른 작업

Books
├─ 책 목록
├─ 책 등록
└─ 책 수정 / 삭제

Members
├─ 멤버 목록
├─ 멤버 추가
└─ 멤버 수정 / 삭제

Meetings
├─ 일정 목록
├─ 일정 추가
└─ 일정 수정 / 삭제

Attendance
├─ 일정 선택
└─ 멤버별 참석 / 불참 / 미정 체크
```

## Supabase 테이블

```txt
books
├─ id
├─ title
├─ author
├─ cover_image
├─ start_date
├─ end_date
├─ status
├─ memo
├─ created_at
└─ updated_at

members
├─ id
├─ name
├─ phone
├─ memo
├─ status
├─ joined_at
├─ created_at
└─ updated_at

meetings
├─ id
├─ book_id
├─ title
├─ meeting_date
├─ meeting_time
├─ location
├─ memo
├─ created_at
└─ updated_at

attendance
├─ id
├─ meeting_id
├─ member_id
├─ status
├─ memo
├─ created_at
└─ updated_at
```

## 디자인 기준

- Pretendard 계열 폰트 우선
- 흰 배경
- 검정 텍스트
- 회색 보조 텍스트
- 1px 테두리
- 그림자 없음
- 0~4px radius
- 넓은 여백

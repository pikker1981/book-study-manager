# 북 스터디 모임 앱 구조 초안

## 앱 정의

소규모 독서모임 운영자가 책, 멤버, 일정, 참석 여부를 간단히 관리하는 내부용 웹앱.

## 핵심 메뉴

```txt
Dashboard
Books
Members
Meetings
Attendance
```

## 데이터 모델

### Book

```ts
type Book = {
  id: string;
  title: string;
  author: string;
  coverImage?: string;
  startDate?: string;
  endDate?: string;
  status: 'reading' | 'finished';
  memo?: string;
};
```

### Member

```ts
type Member = {
  id: string;
  name: string;
  phone?: string;
  memo?: string;
  status: 'active' | 'inactive';
  joinedAt: string;
};
```

### Meeting

```ts
type Meeting = {
  id: string;
  bookId: string;
  title: string;
  date: string;
  time: string;
  location?: string;
  memo?: string;
};
```

### Attendance

```ts
type Attendance = {
  id: string;
  meetingId: string;
  memberId: string;
  status: 'attend' | 'absent' | 'pending';
};
```

## 다음 확장 후보

1. Supabase/Firebase 저장소 연결
2. 카카오톡 공유 문구 생성
3. 참석 현황 CSV 다운로드
4. 책 표지 이미지 업로드
5. 관리자 로그인

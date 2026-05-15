# Book Study Manager 초본

소규모 북 스터디 운영자가 책, 멤버, 일정, 참석 여부를 관리하는 정적 웹앱 초본입니다.

## 포함 기능

- 책 등록 / 수정 / 삭제
- 멤버 추가 / 수정 / 삭제
- 모임 일정 추가 / 수정 / 삭제
- 일정별 참석 / 불참 / 미정 체크
- 대시보드 요약
- 브라우저 localStorage 저장

## 실행 방법

별도 설치 없이 `index.html` 파일을 브라우저로 열면 됩니다.

```txt
book-study-manager/
├─ index.html
├─ style.css
├─ script.js
├─ README.md
└─ docs/
   └─ structure.md
```

## 디자인 기준

- Pretendard 계열 폰트 우선 사용
- 흰 배경 / 검정 텍스트
- 얇은 1px 테두리
- 그림자 없음
- 넓은 여백
- 낮은 radius

## 주의

- 현재 버전은 서버 없이 브라우저 localStorage에만 저장됩니다.
- 다른 PC나 브라우저에서는 데이터가 공유되지 않습니다.
- 실제 운영용으로 확장하려면 Supabase, Firebase, SQLite, PostgreSQL 등 DB 연결이 필요합니다.

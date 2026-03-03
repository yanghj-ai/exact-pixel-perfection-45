

## STEP 4: 인사이트 대시보드

### 구현 내용

**1. 더미 데이터 생성 (`src/lib/insights-data.ts`)**
- 최근 7일치 데이터: 날짜, 완료율(%), 완료 활동 목록, 루틴 후 기분
- `getWeeklyData()` 함수로 정적 더미 데이터 반환
- TOP 3 활동 집계 함수, 기분 변화 데이터 함수

**2. 인사이트 페이지 리빌드 (`src/pages/Insights.tsx`)**
- 4개 섹션으로 구성, `framer-motion` 입장 애니메이션 적용

| 섹션 | 차트/컴포넌트 | 설명 |
|------|-------------|------|
| 스트릭 강조 | 큰 숫자 + 불꽃 아이콘 | `getProfile().streak` 표시, glass-card |
| 주간 완료율 | `BarChart` (recharts) | 7일 막대 차트, teal 컬러, 요일 X축 |
| TOP 3 활동 | 순위 리스트 | 이모지 + 활동명 + 횟수, glass-card |
| 기분 변화 | `LineChart` (recharts) | 7일 기분 점수 라인, mint 그라데이션 area fill |

**3. 차트 스타일링**
- `ChartContainer` + `ChartConfig` 사용하여 다크 테마 색상 적용
- X축: 요일(월~일), Y축: 완료율(%) / 기분 점수
- 툴팁은 `ChartTooltipContent` 활용
- 차트 배경은 투명, glass-card 안에 배치


// ═══════════════════════════════════════════════════════════
// v9 FIX #10: 대사 시스템 전면 개편
// 8개 카테고리, 우선순위 기반, 친밀도 카테고리 삭제
// ═══════════════════════════════════════════════════════════

export type DialogueCategory =
  | 'event'              // 특별 이벤트 (우선순위 1)
  | 'encounter'          // 포켓몬 조우 (우선순위 2)
  | 'running'            // 러닝 중/후 (우선순위 3)
  | 'condition_warning'  // 컨디션 경고 (우선순위 4)
  | 'return'             // 복귀 대사 (우선순위 5)
  | 'default';           // 기본: 시간대+컨디션 (우선순위 6)

export interface DialogueContext {
  pokemonName: string;
  condition: number;     // 0-100
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  isRunning?: boolean;
  streakDays?: number;
  lastRunDate?: string | null;
  lastLoginDate?: string | null;
  encounterHappened?: boolean;
  stepsToday?: number;
  runDistanceKm?: number;
  // legacy compat
  friendship?: number;
}

type DialogueGroup = {
  category: DialogueCategory;
  priority: number;
  condition: (ctx: DialogueContext) => boolean;
  messages: ((ctx: DialogueContext) => string)[];
};

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function getDaysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 999;
  const diff = Date.now() - new Date(dateStr + 'T12:00:00').getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

const DIALOGUE_GROUPS: DialogueGroup[] = [
  // ─── 카테고리 4: 복귀 대사 (lastRunDate 기준) ────
  {
    category: 'return',
    priority: 5,
    condition: (ctx) => getDaysSince(ctx.lastRunDate ?? ctx.lastLoginDate) >= 14,
    messages: [
      (ctx) => `오랜만이다! 걱정했어... 천천히라도 다시 시작해보자!`,
      (ctx) => `${ctx.pokemonName}이(가) 달려왔다! 많이 보고싶었어! 😢`,
    ],
  },
  {
    category: 'return',
    priority: 5,
    condition: (ctx) => getDaysSince(ctx.lastRunDate ?? ctx.lastLoginDate) >= 7,
    messages: [
      (ctx) => `일주일이나 지났어! 나 많이 기다렸다... 같이 달리러 가자!`,
      (ctx) => `${ctx.pokemonName}이(가) 꼬리를 세차게 흔들고 있다! 보고싶었어!`,
    ],
  },
  {
    category: 'return',
    priority: 5,
    condition: (ctx) => getDaysSince(ctx.lastRunDate ?? ctx.lastLoginDate) >= 3,
    messages: [
      (ctx) => `3일이나 못 달렸네! 몸이 근질근질하지 않아?`,
      (ctx) => `${ctx.pokemonName}이(가) 기다리고 있었어! 다시 만나서 반가워! 🥺`,
    ],
  },
  {
    category: 'return',
    priority: 5,
    condition: (ctx) => getDaysSince(ctx.lastRunDate ?? ctx.lastLoginDate) >= 1,
    messages: [
      (ctx) => `어제는 쉬었구나! 오늘은 같이 달리자!`,
    ],
  },

  // ─── 카테고리 2: 컨디션 경고 (20 이하) ──────────
  {
    category: 'condition_warning',
    priority: 4,
    condition: (ctx) => ctx.condition < 20,
    messages: [
      (ctx) => `많이 힘들어... 같이 달려주면 나을 것 같아`,
      (ctx) => `쉬고 싶지만... 조금만 움직여볼까?`,
      (ctx) => `${ctx.pokemonName}이(가) 지쳐 보인다... 러닝으로 회복하자! 😰`,
    ],
  },
  {
    category: 'condition_warning',
    priority: 4,
    condition: (ctx) => ctx.condition < 40,
    messages: [
      (ctx) => `좀 힘들어 보여... 러닝으로 회복하자`,
      (ctx) => `피곤한 것 같아. 천천히 가도 돼`,
    ],
  },

  // ─── 카테고리 7: 포켓몬 조우 (러닝 중) ──────────
  {
    category: 'encounter',
    priority: 2,
    condition: (ctx) => !!ctx.encounterHappened && !!ctx.isRunning,
    messages: [
      () => `오! 포켓몬이다!`,
      () => `새로운 만남이야! ⭐`,
      (ctx) => `${ctx.pokemonName}이(가) 신나하고 있어!`,
    ],
  },

  // ─── 카테고리 5: 러닝 중 대사 (거리별) ──────────
  {
    category: 'running',
    priority: 3,
    condition: (ctx) => !!ctx.isRunning && (ctx.runDistanceKm ?? 0) >= 10,
    messages: [
      () => `10km 전설이야! 너무 자랑스러워! 🏆`,
    ],
  },
  {
    category: 'running',
    priority: 3,
    condition: (ctx) => !!ctx.isRunning && (ctx.runDistanceKm ?? 0) >= 5,
    messages: [
      () => `5km 완주! 최고의 팀이야! ⭐`,
    ],
  },
  {
    category: 'running',
    priority: 3,
    condition: (ctx) => !!ctx.isRunning && (ctx.runDistanceKm ?? 0) >= 3,
    messages: [
      () => `3km! 우리 대단하지 않아? 🎊`,
    ],
  },
  {
    category: 'running',
    priority: 3,
    condition: (ctx) => !!ctx.isRunning && (ctx.runDistanceKm ?? 0) >= 2,
    messages: [
      () => `2km 돌파! 점점 달아오르고 있어! 🔥`,
    ],
  },
  {
    category: 'running',
    priority: 3,
    condition: (ctx) => !!ctx.isRunning && (ctx.runDistanceKm ?? 0) >= 1,
    messages: [
      () => `좋은 출발이야! 이 페이스 좋아! 💪`,
    ],
  },
  {
    category: 'running',
    priority: 3,
    condition: (ctx) => !!ctx.isRunning,
    messages: [
      (ctx) => `${ctx.pokemonName}이(가) 함께 뛰고 있어! 파이팅! 💪`,
      () => `좋은 페이스야! 응원하고 있어!`,
      () => `같이 달리니까 기분이 좋아! 🏃`,
      (ctx) => `${ctx.pokemonName}이(가) 즐거워 보인다!`,
    ],
  },

  // ─── 카테고리 2: 컨디션 반응 (5단계) ────────────
  {
    category: 'default',
    priority: 6,
    condition: (ctx) => ctx.condition >= 80,
    messages: [
      () => `컨디션 최고! 뭐든 할 수 있어! 🤩`,
      () => `몸 상태 완벽해! 배틀도 OK!`,
      (ctx) => `${ctx.pokemonName}이(가) 에너지가 넘친다!`,
    ],
  },
  {
    category: 'default',
    priority: 6,
    condition: (ctx) => ctx.condition >= 60,
    messages: [
      () => `상태 좋아! 오늘도 힘내자!`,
      () => `좋은 컨디션이야. 러닝 가자! 😊`,
      (ctx) => `${ctx.pokemonName}이(가) 기분 좋아 보인다!`,
    ],
  },
  {
    category: 'default',
    priority: 6,
    condition: (ctx) => ctx.condition >= 40,
    messages: [
      () => `괜찮은 상태야. 러닝하면 더 좋아질 거야`,
      () => `보통이야. 가볍게 달려볼까?`,
    ],
  },

  // ─── 카테고리 1: 시간대별 인사 ──────────────────
  {
    category: 'default',
    priority: 6,
    condition: () => true,
    messages: [
      (ctx) => {
        switch (ctx.timeOfDay) {
          case 'morning':
            return ['좋은 아침! 오늘도 같이 달려볼까?', '아침 공기가 좋다! 런닝 가자!', '일어났구나! 오늘 목표는 몇 km?'][Math.floor(Math.random() * 3)];
          case 'afternoon':
            return ['점심 먹고 가볍게 달려볼까?', '날씨 좋은데 런닝 어때?', '오후 런닝은 기분 전환에 최고야!'][Math.floor(Math.random() * 3)];
          case 'evening':
            return ['저녁 런닝 시간이야!', '하루 마무리 런닝 어때?', '선선해서 달리기 좋겠다!'][Math.floor(Math.random() * 3)];
          case 'night':
            return ['밤이 깊었네. 내일 아침에 같이 달리자!', '늦은 시간이야. 푹 쉬어!', '오늘 하루 수고했어. 내일 또 만나!'][Math.floor(Math.random() * 3)];
        }
      },
      (ctx) => `${ctx.pokemonName}이(가) 이쪽을 보고 있다`,
      (ctx) => `${ctx.pokemonName}이(가) 주변을 두리번거리고 있다`,
    ],
  },
];

/** 최우선 트리거의 랜덤 대사 반환 */
export function getCompanionDialogue(context: Partial<DialogueContext> & { pokemonName: string }): string {
  const ctx: DialogueContext = {
    pokemonName: context.pokemonName,
    condition: context.condition ?? 80,
    timeOfDay: context.timeOfDay ?? getTimeOfDay(),
    isRunning: context.isRunning,
    streakDays: context.streakDays,
    lastRunDate: context.lastRunDate,
    lastLoginDate: context.lastLoginDate,
    encounterHappened: context.encounterHappened,
    stepsToday: context.stepsToday,
    runDistanceKm: context.runDistanceKm,
    friendship: context.friendship,
  };

  // Sort by priority ascending (lower = higher priority), find first matching
  const sorted = [...DIALOGUE_GROUPS].sort((a, b) => a.priority - b.priority);
  for (const group of sorted) {
    if (group.condition(ctx)) {
      const msg = group.messages[Math.floor(Math.random() * group.messages.length)];
      return msg(ctx);
    }
  }

  return `${ctx.pokemonName}이(가) 이쪽을 보고 있다`;
}

/** 러닝 중 응원 메시지 (v9: 거리 기반 5단계) */
export function getRunningCheer(pokemonName: string, steps: number, _friendship: number): string {
  const km = steps * 0.0007; // rough estimate
  if (km >= 10) return `${pokemonName}: 10km 전설이야! 너무 자랑스러워! 🏆`;
  if (km >= 5) return `${pokemonName}: 5km 완주! 최고의 팀이야! ⭐`;
  if (km >= 3) return `${pokemonName}: 3km! 우리 대단하지 않아? 🎊`;
  if (km >= 2) return `${pokemonName}: 2km 돌파! 점점 달아오르고 있어! 🔥`;
  if (km >= 1) return `${pokemonName}: 좋은 출발이야! 이 페이스 좋아! 💪`;
  if (steps >= 500) return `${pokemonName}: 같이 달리니까 즐거워! 😊`;
  return `${pokemonName}: 출발이야! 가자! 🏃`;
}

/** 러닝 후 대사 (v9: 4가지 상황) */
export function getPostRunDialogue(pokemonName: string, distanceKm: number, isNewRecord: boolean): string {
  if (isNewRecord) {
    return ['새 기록이야! 우리 정말 최고다!', '대박! 기록 갱신! 🎉'][Math.floor(Math.random() * 2)];
  }
  if (distanceKm >= 5) {
    return ['대단한 러닝이었어! 진짜 멋있었다!', '긴 거리 수고했어. 최고야! 💪'][Math.floor(Math.random() * 2)];
  }
  if (distanceKm < 1) {
    return '짧지만 달렸다는 게 중요해! 내일은 좀 더 가볼까?';
  }
  return ['수고했어! 오늘도 좋은 런닝이었어!', '잘 달렸다! 내일도 같이 하자! 😊'][Math.floor(Math.random() * 2)];
}

/** 포켓몬 조우 대사 (v9: 4등급) */
export function getEncounterDialogue(grade: 'normal' | 'rare' | 'unique' | 'legendary'): string {
  switch (grade) {
    case 'legendary': return '전... 전설의 포켓몬이야?! 말도 안 돼! 🌟';
    case 'unique': return '이건 정말 귀한 포켓몬이야! 운이 좋아! ✨';
    case 'rare': return '이 포켓몬 괜찮은데? 잘 만났다!';
    default: return ['오! 포켓몬이다!', '새로운 만남이야!'][Math.floor(Math.random() * 2)];
  }
}

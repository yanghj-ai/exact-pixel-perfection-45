// ═══════════════════════════════════════════════════════════
// FIX #5: 동반 포켓몬 대사 시스템
// 우선순위 기반 컨텍스트 대사 생성
// ═══════════════════════════════════════════════════════════

export interface DialogueContext {
  pokemonName: string;
  friendship: number; // 0-255
  condition: number;  // 0-100
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  isRunning?: boolean;
  streakDays?: number;
  lastLoginDate?: string | null;
  encounterHappened?: boolean;
  stepsToday?: number;
}

type DialogueGroup = {
  priority: number;
  condition: (ctx: DialogueContext) => boolean;
  messages: ((ctx: DialogueContext) => string)[];
};

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function getDaysSinceLogin(lastLoginDate: string | null): number {
  if (!lastLoginDate) return 999;
  const last = new Date(lastLoginDate);
  const now = new Date();
  return Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
}

const DIALOGUE_GROUPS: DialogueGroup[] = [
  // 1. 복귀 대사 (7일+)
  {
    priority: 10,
    condition: (ctx) => getDaysSinceLogin(ctx.lastLoginDate ?? null) >= 7,
    messages: [
      (ctx) => `${ctx.pokemonName}이(가) 눈물을 글썽이고 있다... 보고 싶었어!`,
      (ctx) => `${ctx.pokemonName}이(가) 달려왔다! 어디 갔었어?! 😢`,
    ],
  },
  // 2. 복귀 대사 (3일+)
  {
    priority: 9,
    condition: (ctx) => getDaysSinceLogin(ctx.lastLoginDate ?? null) >= 3,
    messages: [
      (ctx) => `${ctx.pokemonName}이(가) 기다리고 있었어! 다시 만나서 반가워! 🥺`,
      (ctx) => `며칠 만이야! ${ctx.pokemonName}이(가) 꼬리를 세차게 흔들고 있다!`,
    ],
  },
  // 3. 복귀 대사 (1일)
  {
    priority: 8,
    condition: (ctx) => getDaysSinceLogin(ctx.lastLoginDate ?? null) >= 1,
    messages: [
      (ctx) => `어제는 바빴어? ${ctx.pokemonName}이(가) 기다렸어!`,
    ],
  },
  // 4. 컨디션 나쁨
  {
    priority: 7,
    condition: (ctx) => ctx.condition < 30,
    messages: [
      (ctx) => `${ctx.pokemonName}이(가) 지쳐 보인다... 좀 쉴까? 😥`,
      (ctx) => `컨디션이 좋지 않아... 같이 산책하면 나아질 거야`,
    ],
  },
  // 5. 러닝 중 조우
  {
    priority: 6,
    condition: (ctx) => !!ctx.encounterHappened && !!ctx.isRunning,
    messages: [
      (ctx) => `와! 새 포켓몬이다! ${ctx.pokemonName}이(가) 신나하고 있어! ⭐`,
      (ctx) => `${ctx.pokemonName}이(가) 도감을 보여달라고 한다!`,
    ],
  },
  // 6. 러닝 중
  {
    priority: 5,
    condition: (ctx) => !!ctx.isRunning,
    messages: [
      (ctx) => `${ctx.pokemonName}이(가) 함께 뛰고 있어! 파이팅! 💪`,
      (ctx) => `좋은 페이스야! ${ctx.pokemonName}이(가) 응원하고 있어!`,
      (ctx) => `같이 달리니까 기분이 좋아! 🏃`,
      (ctx) => `${ctx.pokemonName}이(가) 즐거워 보인다!`,
    ],
  },
  // 7. 친밀도 높음 (220+)
  {
    priority: 4,
    condition: (ctx) => ctx.friendship >= 220,
    messages: [
      (ctx) => `${ctx.pokemonName}이(가) 품에 안기고 싶어한다! 💖`,
      (ctx) => `최고의 파트너! ${ctx.pokemonName}이(가) 행복해 보인다!`,
      (ctx) => `${ctx.pokemonName}은(는) 너를 깊이 신뢰하고 있다!`,
    ],
  },
  // 8. 친밀도 보통 (70-219)
  {
    priority: 3,
    condition: (ctx) => ctx.friendship >= 70,
    messages: [
      (ctx) => `${ctx.pokemonName}이(가) 다가왔다! 😊`,
      (ctx) => `${ctx.pokemonName}이(가) 꼬리를 흔들고 있다!`,
    ],
  },
  // 9. 시간대 인사
  {
    priority: 2,
    condition: () => true,
    messages: [
      (ctx) => {
        switch (ctx.timeOfDay) {
          case 'morning': return `좋은 아침! ${ctx.pokemonName}이(가) 기지개를 켜고 있다 ☀️`;
          case 'afternoon': return `${ctx.pokemonName}이(가) 점심 먹었냐고 물어본다 🍙`;
          case 'evening': return `저녁이야! ${ctx.pokemonName}이(가) 같이 산책하자고 한다 🌅`;
          case 'night': return `${ctx.pokemonName}이(가) 졸려 보인다... 🌙`;
        }
      },
    ],
  },
  // 10. 기본 대사
  {
    priority: 1,
    condition: () => true,
    messages: [
      (ctx) => `${ctx.pokemonName}이(가) 기분 좋아 보인다!`,
      (ctx) => `${ctx.pokemonName}이(가) 이쪽을 보고 있다`,
      (ctx) => `${ctx.pokemonName}이(가) 주변을 두리번거리고 있다`,
    ],
  },
];

/** 최우선 트리거의 랜덤 대사 반환 */
export function getCompanionDialogue(context: Partial<DialogueContext> & { pokemonName: string }): string {
  const ctx: DialogueContext = {
    pokemonName: context.pokemonName,
    friendship: context.friendship ?? 70,
    condition: context.condition ?? 80,
    timeOfDay: context.timeOfDay ?? getTimeOfDay(),
    isRunning: context.isRunning,
    streakDays: context.streakDays,
    lastLoginDate: context.lastLoginDate,
    encounterHappened: context.encounterHappened,
    stepsToday: context.stepsToday,
  };

  // Sort by priority descending, find first matching
  const sorted = [...DIALOGUE_GROUPS].sort((a, b) => b.priority - a.priority);
  for (const group of sorted) {
    if (group.condition(ctx)) {
      const msg = group.messages[Math.floor(Math.random() * group.messages.length)];
      return msg(ctx);
    }
  }

  return `${ctx.pokemonName}이(가) 이쪽을 보고 있다`;
}

/** 러닝 중 응원 메시지 (cheerMessage 대체) */
export function getRunningCheer(pokemonName: string, steps: number, friendship: number): string {
  if (steps >= 5000 && friendship >= 170) return `${pokemonName}: 최고야! 너랑 같이라면 어디든! 💖`;
  if (steps >= 3000) return `${pokemonName}: 대단해! 조금만 더 힘내자! 🔥`;
  if (steps >= 1000) return `${pokemonName}: 좋은 페이스야! 파이팅! 💪`;
  if (steps >= 500) return `${pokemonName}: 같이 달리니까 즐거워! 😊`;
  return `${pokemonName}: 출발이야! 가자! 🏃`;
}

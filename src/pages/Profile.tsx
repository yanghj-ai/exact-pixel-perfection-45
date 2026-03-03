import { getProfile } from '@/lib/storage';
import BottomNav from '@/components/BottomNav';
import { User } from 'lucide-react';

export default function Profile() {
  const profile = getProfile();

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-5 pt-12">
        <div className="glass-card flex flex-col items-center p-8 text-center mb-6">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full gradient-primary">
            <User className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{profile.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Lv.1 루틴 새내기 🌱</p>
          <div className="mt-4 w-full rounded-full bg-muted h-2">
            <div className="h-2 rounded-full gradient-primary" style={{ width: '15%' }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">다음 레벨까지 85 XP</p>
        </div>

        <div className="glass-card p-5">
          <h2 className="font-semibold text-foreground mb-3">통계</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">0</p>
              <p className="text-xs text-muted-foreground">완료 루틴</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-accent">{profile.streak}</p>
              <p className="text-xs text-muted-foreground">최장 스트릭</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary">0%</p>
              <p className="text-xs text-muted-foreground">이번 달</p>
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

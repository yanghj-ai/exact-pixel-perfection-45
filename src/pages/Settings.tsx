import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getProfile, saveProfile } from '@/lib/storage';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Moon, Bell, RotateCcw, HelpCircle } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

export default function Settings() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(getProfile());

  const updateSetting = (key: 'notificationsEnabled' | 'darkMode', value: boolean) => {
    const updated = saveProfile({ [key]: value });
    setProfile(updated);
    if (key === 'darkMode') {
      document.documentElement.classList.toggle('dark', value);
      document.documentElement.classList.toggle('light', !value);
    }
    toast(value ? '설정이 활성화되었어요' : '설정이 비활성화되었어요');
  };

  const handleReset = () => {
    if (confirm('모든 데이터를 초기화하시겠어요? 파이리와의 추억이 사라집니다 😢')) {
      localStorage.removeItem('routinmon-profile');
      localStorage.removeItem('routinmon-pet');
      localStorage.removeItem('routinmon-running');
      localStorage.removeItem('routinmon-collection');
      localStorage.removeItem('routinmon-legendary');
      localStorage.removeItem('routinmon-battles');
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-5 pt-10 space-y-5">
        <h1 className="text-2xl font-bold text-foreground">설정</h1>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card divide-y divide-border/50"
        >
          {/* Dark mode */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Moon size={18} className="text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">다크 모드</span>
            </div>
            <Switch
              checked={profile.darkMode}
              onCheckedChange={(v) => updateSetting('darkMode', v)}
            />
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Bell size={18} className="text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">알림</span>
            </div>
            <Switch
              checked={profile.notificationsEnabled}
              onCheckedChange={(v) => updateSetting('notificationsEnabled', v)}
            />
          </div>

          {/* Help */}
          <button className="flex w-full items-center gap-3 p-4 text-left">
            <HelpCircle size={18} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">도움말 & 피드백</span>
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="flex w-full items-center gap-3 p-4 text-left"
          >
            <RotateCcw size={18} className="text-destructive" />
            <span className="text-sm font-medium text-destructive">데이터 초기화</span>
          </button>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          루틴몬 v1.0 · Routinmon 🔥
        </p>
      </div>
      <BottomNav />
    </div>
  );
}

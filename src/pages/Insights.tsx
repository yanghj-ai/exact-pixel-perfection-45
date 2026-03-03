import BottomNav from '@/components/BottomNav';
import { BarChart3 } from 'lucide-react';

export default function Insights() {
  return (
    <div className="min-h-screen pb-24">
      <div className="mx-auto max-w-md px-5 pt-12">
        <h1 className="text-2xl font-bold text-foreground mb-4">인사이트</h1>
        <div className="glass-card flex flex-col items-center justify-center p-12 text-center">
          <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">루틴을 시작하면<br/>인사이트가 쌓여요</p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// GPS 트래커 — 보조 데이터 (루트 기록, 페이스 표시, 부정 방지 검증)
// GPS는 보상 계산에 직접 사용하지 않음
// ═══════════════════════════════════════════════════════════

export interface GpsPoint {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy: number; // meters
}

export class GpsTracker {
  private watchId: number | null = null;
  private points: GpsPoint[] = [];
  private totalDistanceM = 0;
  private onUpdate: ((point: GpsPoint, distanceKm: number) => void) | null = null;

  start(onUpdate?: (point: GpsPoint, distanceKm: number) => void): boolean {
    if (!navigator.geolocation) return false;
    this.onUpdate = onUpdate ?? null;
    this.points = [];
    this.totalDistanceM = 0;

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        // 정확도 50m 이상이면 무시 (터널, 실내 등)
        if (pos.coords.accuracy > 50) return;

        const point: GpsPoint = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: pos.timestamp,
          accuracy: pos.coords.accuracy,
        };

        if (this.points.length > 0) {
          const prev = this.points[this.points.length - 1];
          this.totalDistanceM += haversineMeters(
            prev.lat, prev.lng, point.lat, point.lng
          );
        }

        this.points.push(point);
        this.onUpdate?.(point, this.totalDistanceM / 1000);
      },
      () => {}, // 에러 무시 (GPS 없어도 만보기로 동작)
      { enableHighAccuracy: true, maximumAge: 5000 },
    );

    return true;
  }

  stop(): { points: GpsPoint[]; distanceKm: number } {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    return {
      points: [...this.points],
      distanceKm: this.totalDistanceM / 1000,
    };
  }

  /** 현재 페이스 (분/km) — 최근 5포인트 기반 */
  getCurrentPace(): number | null {
    if (this.points.length < 2) return null;
    const recent = this.points.slice(-5);
    let dist = 0;
    for (let i = 1; i < recent.length; i++) {
      dist += haversineMeters(
        recent[i - 1].lat, recent[i - 1].lng,
        recent[i].lat, recent[i].lng
      );
    }
    const timeMin = (recent[recent.length - 1].timestamp - recent[0].timestamp) / 60000;
    const distKm = dist / 1000;
    if (distKm < 0.01) return null; // 정지 상태
    return timeMin / distKm;
  }

  getPoints(): GpsPoint[] {
    return [...this.points];
  }

  getDistanceKm(): number {
    return this.totalDistanceM / 1000;
  }

  isTracking(): boolean {
    return this.watchId !== null;
  }

  static isAvailable(): boolean {
    return !!navigator.geolocation;
  }
}

// Haversine 공식 (미터 단위)
function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

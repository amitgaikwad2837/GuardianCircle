import Geolocation from 'react-native-geolocation-service';
import { PermissionsAndroid, Platform, type Permission } from 'react-native';
import { Logger } from '@core/logger/Logger';

const TAG = 'LocationService';

export interface Coordinates {
  lat: number;
  lng: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  timestamp: number;
}

export type LocationMode = 'emergency' | 'journey' | 'geofence' | 'on_demand';

const UPDATE_INTERVALS: Record<LocationMode, number> = {
  emergency: 15_000,   // 15s — high frequency during SOS
  journey: 300_000,    // 5 min — fused location, battery-efficient
  geofence: 600_000,   // 10 min — passive monitoring
  on_demand: 0,        // single fetch
};

class LocationServiceClass {
  private watchId: number | null = null;
  private currentMode: LocationMode | null = null;
  private listeners: ((location: Coordinates) => void)[] = [];

  async requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {return false;}
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION as Permission,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  async getCurrentLocation(): Promise<Coordinates> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (pos) => resolve(this.toCoordinates(pos)),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
      );
    });
  }

  startTracking(mode: LocationMode, onLocation: (loc: Coordinates) => void): void {
    if (this.watchId !== null) {this.stopTracking();}
    this.currentMode = mode;
    this.listeners.push(onLocation);

    this.watchId = Geolocation.watchPosition(
      (pos) => {
        const coords = this.toCoordinates(pos);
        this.listeners.forEach((l) => l(coords));
      },
      (err) => Logger.warn(TAG, 'watch error', { message: err instanceof Error ? err.message : String(err) }),
      {
        enableHighAccuracy: mode === 'emergency',
        interval: UPDATE_INTERVALS[mode],
        fastestInterval: UPDATE_INTERVALS[mode] / 2,
        distanceFilter: mode === 'emergency' ? 10 : 50,
      },
    );
  }

  stopTracking(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.currentMode = null;
      this.listeners = [];
    }
  }

  toGoogleMapsLink(coords: Coordinates): string {
    return `https://maps.google.com/?q=${coords.lat},${coords.lng}`;
  }

  private toCoordinates(pos: Geolocation.GeoPosition): Coordinates {
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      altitude: pos.coords.altitude ?? undefined,
      speed: pos.coords.speed ?? undefined,
      timestamp: pos.timestamp,
    };
  }
}

export const LocationService = new LocationServiceClass();

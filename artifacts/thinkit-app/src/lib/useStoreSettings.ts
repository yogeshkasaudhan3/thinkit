/**
 * Module-level store-settings cache.
 * Fetches once per session (TTL: 5 min) and is shared across all subscribers.
 * Always returns safe defaults immediately — no loading-state guard needed.
 */

import { useState, useEffect } from 'react';

const TTL_MS = 5 * 60 * 1000;

export interface StoreSettings {
  storeName: string;
  contactNumber: string;
  whatsappNumber: string;
  supportEmail: string;
  storeAddress: string;
  businessHours: string;
  deliveryRadiusKm: number;
  freeDeliveryThreshold: number;
  smallCartFeeThreshold: number;
  smallCartFee: number;
  deliveryFee: number;
  handlingFee: number;
  minOrderEnabled: boolean;
  minOrderValue: number;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'Dwarika Grocery Mart',
  contactNumber: '+91 9876543210',
  whatsappNumber: '+91 9876543210',
  supportEmail: 'support@thinkit.com',
  storeAddress: '',
  businessHours: '8:00 AM - 10:00 PM',
  deliveryRadiusKm: 3,
  freeDeliveryThreshold: 150,
  smallCartFeeThreshold: 100,
  smallCartFee: 20,
  deliveryFee: 20,
  handlingFee: 5,
  minOrderEnabled: false,
  minOrderValue: 0,
};

/** Safe numeric parse that preserves 0 and falls back to a default only on NaN/null/undefined */
function safeNum(v: unknown, fallback: number): number {
  if (v === null || v === undefined) return fallback;
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}

function parseSettings(raw: Record<string, unknown>): StoreSettings {
  return {
    storeName: typeof raw.storeName === 'string' ? raw.storeName : DEFAULT_SETTINGS.storeName,
    contactNumber: typeof raw.contactNumber === 'string' ? raw.contactNumber : DEFAULT_SETTINGS.contactNumber,
    whatsappNumber: typeof raw.whatsappNumber === 'string' ? raw.whatsappNumber : DEFAULT_SETTINGS.whatsappNumber,
    supportEmail: typeof raw.supportEmail === 'string' ? raw.supportEmail : DEFAULT_SETTINGS.supportEmail,
    storeAddress: typeof raw.storeAddress === 'string' ? raw.storeAddress : DEFAULT_SETTINGS.storeAddress,
    businessHours: typeof raw.businessHours === 'string' ? raw.businessHours : DEFAULT_SETTINGS.businessHours,
    deliveryRadiusKm: safeNum(raw.deliveryRadiusKm, DEFAULT_SETTINGS.deliveryRadiusKm),
    freeDeliveryThreshold: safeNum(raw.freeDeliveryThreshold, DEFAULT_SETTINGS.freeDeliveryThreshold),
    smallCartFeeThreshold: safeNum(raw.smallCartFeeThreshold, DEFAULT_SETTINGS.smallCartFeeThreshold),
    smallCartFee: safeNum(raw.smallCartFee, DEFAULT_SETTINGS.smallCartFee),
    deliveryFee: safeNum(raw.deliveryFee, DEFAULT_SETTINGS.deliveryFee),
    handlingFee: safeNum(raw.handlingFee, DEFAULT_SETTINGS.handlingFee),
    minOrderEnabled: Boolean(raw.minOrderEnabled),
    minOrderValue: safeNum(raw.minOrderValue, DEFAULT_SETTINGS.minOrderValue),
  };
}

/** Strip non-digit chars for use in tel: / wa.me links */
export function toPhoneDigits(number: string): string {
  return number.replace(/\D/g, '');
}

let cachedSettings: StoreSettings | null = null;
let loadedAt: number | null = null;
let loadState: 'idle' | 'loading' | 'done' | 'error' = 'idle';
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((fn) => fn());
}

function isFresh() {
  return loadedAt !== null && Date.now() - loadedAt < TTL_MS;
}

function ensureLoaded() {
  if (loadState === 'loading') return;
  if (loadState === 'done' && isFresh()) return;

  loadState = 'loading';
  fetch('/api/settings', { credentials: 'include' })
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((raw) => {
      cachedSettings = parseSettings(raw as Record<string, unknown>);
      loadedAt = Date.now();
      loadState = 'done';
      notify();
    })
    .catch(() => {
      loadState = 'error';
      notify();
    });
}

export function invalidateSettingsCache() {
  loadedAt = null;
  if (loadState === 'done') loadState = 'idle';
}

export function useStoreSettings() {
  const [, rerender] = useState(0);

  useEffect(() => {
    const fn = () => rerender((n) => n + 1);
    subscribers.add(fn);
    ensureLoaded();
    return () => {
      subscribers.delete(fn);
    };
  }, []);

  return {
    settings: cachedSettings ?? DEFAULT_SETTINGS,
    loaded: loadState === 'done',
  };
}

import { describe, it, expect } from 'vitest';
import { resolvePeriod, isValidPeriod } from './periods';

describe('periods', () => {
  describe('isValidPeriod', () => {
    it('returns true for valid periods', () => {
      expect(isValidPeriod('1d')).toBe(true);
      expect(isValidPeriod('7d')).toBe(true);
      expect(isValidPeriod('30d')).toBe(true);
      expect(isValidPeriod('month')).toBe(true);
    });

    it('returns false for invalid periods', () => {
      expect(isValidPeriod('1y')).toBe(false);
      expect(isValidPeriod(null)).toBe(false);
      expect(isValidPeriod('')).toBe(false);
    });
  });

  describe('resolvePeriod', () => {
    it('resolves 1d correctly in UTC', () => {
      const now = new Date(Date.UTC(2023, 5, 15, 12, 0, 0)); // June 15, 2023 12:00:00 UTC
      const result = resolvePeriod('1d', now);
      
      expect(result.period).toBe('1d');
      expect(result.label).toBe('Today (UTC)');
      expect(result.start).toEqual(new Date(Date.UTC(2023, 5, 15, 0, 0, 0, 0)));
      expect(result.end).toEqual(new Date(Date.UTC(2023, 5, 15, 23, 59, 59, 999)));
    });

    it('resolves 7d correctly in UTC', () => {
      const now = new Date(Date.UTC(2023, 5, 15, 12, 0, 0));
      const result = resolvePeriod('7d', now);
      
      expect(result.period).toBe('7d');
      expect(result.label).toBe('Last 7 Days (UTC)');
      expect(result.start).toEqual(new Date(Date.UTC(2023, 5, 9, 0, 0, 0, 0)));
      expect(result.end).toEqual(new Date(Date.UTC(2023, 5, 15, 23, 59, 59, 999)));
    });

    it('resolves 30d correctly in UTC', () => {
      const now = new Date(Date.UTC(2023, 5, 15, 12, 0, 0));
      const result = resolvePeriod('30d', now);
      
      expect(result.period).toBe('30d');
      expect(result.label).toBe('Last 30 Days (UTC)');
      expect(result.start).toEqual(new Date(Date.UTC(2023, 4, 17, 0, 0, 0, 0)));
      expect(result.end).toEqual(new Date(Date.UTC(2023, 5, 15, 23, 59, 59, 999)));
    });

    it('resolves month correctly in UTC', () => {
      const now = new Date(Date.UTC(2023, 5, 15, 12, 0, 0));
      const result = resolvePeriod('month', now);
      
      expect(result.period).toBe('month');
      expect(result.label).toBe('This Month (UTC)');
      expect(result.start).toEqual(new Date(Date.UTC(2023, 5, 1, 0, 0, 0, 0)));
      expect(result.end).toEqual(new Date(Date.UTC(2023, 6, 0, 23, 59, 59, 999)));
    });

    it('defaults to 1d for unknown periods', () => {
      const now = new Date(Date.UTC(2023, 5, 15, 12, 0, 0));
      const result = resolvePeriod('unknown' as any, now);
      
      expect(result.period).toBe('1d');
      expect(result.label).toBe('Today (UTC)');
    });
  });
});

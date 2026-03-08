import { deg2rad, clamp } from './math/core';

describe('Math functions', () => {
  test('deg2rad converts degrees to radians correctly', () => {
    expect(deg2rad(0)).toBe(0);
    expect(deg2rad(90)).toBeCloseTo(Math.PI / 2);
    expect(deg2rad(180)).toBeCloseTo(Math.PI);
    expect(deg2rad(360)).toBeCloseTo(Math.PI * 2);
  });

  test('clamp limits a value within a range', () => {
    expect(clamp(10, [0, 100])).toBe(10);
    expect(clamp(-5, [0, 100])).toBe(0);
    expect(clamp(150, [0, 100])).toBe(100);
    expect(clamp(50, [50, 50])).toBe(50);
  });
});



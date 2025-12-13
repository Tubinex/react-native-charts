import type { AreaLineDataPoint } from '../types';

export interface Padding {
	top: number;
	right: number;
	bottom: number;
	left: number;
}

export interface ScreenPoint {
	x: number;
	y: number;
	dataIndex: number;
}

export function dataToScreen(
	point: AreaLineDataPoint,
	minX: number,
	maxX: number,
	minY: number,
	maxY: number,
	chartWidth: number,
	chartHeight: number,
	padding: Padding
): ScreenPoint {
	'worklet';
	const rangeX = maxX - minX || 1;
	const rangeY = maxY - minY || 1;

	const normalizedX = (point.x - minX) / rangeX;
	const normalizedY = (point.y - minY) / rangeY;

	const screenX = padding.left + normalizedX * chartWidth;
	const screenY = padding.top + chartHeight - normalizedY * chartHeight;

	return {
		x: screenX,
		y: screenY,
		dataIndex: -1,
	};
}

export function screenToData(
	screenX: number,
	screenY: number,
	minX: number,
	maxX: number,
	minY: number,
	maxY: number,
	chartWidth: number,
	chartHeight: number,
	padding: Padding
): { x: number; y: number } {
	'worklet';
	const rangeX = maxX - minX || 1;
	const rangeY = maxY - minY || 1;

	const normalizedX = (screenX - padding.left) / chartWidth;
	const normalizedY = 1 - (screenY - padding.top) / chartHeight;

	const dataX = minX + normalizedX * rangeX;
	const dataY = minY + normalizedY * rangeY;

	return { x: dataX, y: dataY };
}

export function findNearestPoint(
	screenX: number,
	screenPoints: ScreenPoint[]
): number {
	'worklet';
	if (screenPoints.length === 0) return -1;
	if (screenPoints.length === 1) return 0;

	if (screenX <= screenPoints[0].x) return 0;
	if (screenX >= screenPoints[screenPoints.length - 1].x)
		return screenPoints.length - 1;

	let left = 0;
	let right = screenPoints.length - 1;

	while (left <= right) {
		const mid = Math.floor((left + right) / 2);
		const point = screenPoints[mid];

		if (point.x === screenX) {
			return mid;
		} else if (point.x < screenX) {
			left = mid + 1;
		} else {
			right = mid - 1;
		}
	}

	if (left >= screenPoints.length) return right;
	if (right < 0) return left;

	const leftDist = Math.abs(screenPoints[left].x - screenX);
	const rightDist = Math.abs(screenPoints[right].x - screenX);

	return leftDist < rightDist ? left : right;
}

export function clamp(value: number, min: number, max: number): number {
	'worklet';
	return Math.min(Math.max(value, min), max);
}

export function isPointInsideChartBounds(
	x: number,
	y: number,
	chartBounds: { x: number; y: number; width: number; height: number }
): boolean {
	'worklet';
	return (
		x >= chartBounds.x &&
		x <= chartBounds.x + chartBounds.width &&
		y >= chartBounds.y &&
		y <= chartBounds.y + chartBounds.height
	);
}

export function lerp(start: number, end: number, progress: number): number {
	'worklet';
	return start + (end - start) * progress;
}

export function interpolateYAtX(
	screenX: number,
	screenPoints: ScreenPoint[]
): number {
	'worklet';
	if (screenPoints.length === 0) return 0;
	if (screenPoints.length === 1) return screenPoints[0].y;

	if (screenX <= screenPoints[0].x) return screenPoints[0].y;
	if (screenX >= screenPoints[screenPoints.length - 1].x)
		return screenPoints[screenPoints.length - 1].y;

	for (let i = 0; i < screenPoints.length - 1; i++) {
		const p1 = screenPoints[i];
		const p2 = screenPoints[i + 1];

		if (screenX >= p1.x && screenX <= p2.x) {
			const t = (screenX - p1.x) / (p2.x - p1.x);
			return lerp(p1.y, p2.y, t);
		}
	}

	return screenPoints[screenPoints.length - 1].y;
}

function calculateMonotoneControlPoints(
	points: ScreenPoint[]
): { cp1x: number[]; cp1y: number[]; cp2x: number[]; cp2y: number[] } {
	'worklet';
	const n = points.length;
	const cp1x: number[] = [];
	const cp1y: number[] = [];
	const cp2x: number[] = [];
	const cp2y: number[] = [];

	if (n < 2) {
		return { cp1x, cp1y, cp2x, cp2y };
	}

	const slopes: number[] = [];
	for (let i = 0; i < n - 1; i++) {
		const dx = points[i + 1].x - points[i].x;
		const dy = points[i + 1].y - points[i].y;
		slopes[i] = dx !== 0 ? dy / dx : 0;
	}

	const tangents: number[] = [slopes[0]];
	for (let i = 1; i < n - 1; i++) {
		const slope1 = slopes[i - 1];
		const slope2 = slopes[i];

		if (slope1 * slope2 <= 0) {
			tangents[i] = 0;
		} else {
			const dx1 = points[i].x - points[i - 1].x;
			const dx2 = points[i + 1].x - points[i].x;
			const w1 = 2 * dx2 + dx1;
			const w2 = dx2 + 2 * dx1;
			tangents[i] = (3 * (w1 + w2)) / ((w1 / slope1) + (w2 / slope2));
		}
	}

	tangents[n - 1] = slopes[n - 2];
	for (let i = 0; i < n - 1; i++) {
		const dx = (points[i + 1].x - points[i].x) / 3;

		cp1x[i] = points[i].x + dx;
		cp1y[i] = points[i].y + dx * tangents[i];

		cp2x[i] = points[i + 1].x - dx;
		cp2y[i] = points[i + 1].y - dx * tangents[i + 1];
	}

	return { cp1x, cp1y, cp2x, cp2y };
}

function cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
	'worklet';
	const oneMinusT = 1 - t;
	return (
		oneMinusT * oneMinusT * oneMinusT * p0 +
		3 * oneMinusT * oneMinusT * t * p1 +
		3 * oneMinusT * t * t * p2 +
		t * t * t * p3
	);
}

export function interpolateYAtXSmooth(
	screenX: number,
	screenPoints: ScreenPoint[]
): number {
	'worklet';

	if (screenPoints.length === 0) return 0;
	if (screenPoints.length === 1) return screenPoints[0].y;

	if (screenX <= screenPoints[0].x) return screenPoints[0].y;
	if (screenX >= screenPoints[screenPoints.length - 1].x)
		return screenPoints[screenPoints.length - 1].y;

	const { cp1x, cp1y, cp2x, cp2y } = calculateMonotoneControlPoints(screenPoints);
	for (let i = 0; i < screenPoints.length - 1; i++) {
		const p0 = screenPoints[i];
		const p3 = screenPoints[i + 1];

		if (screenX >= p0.x && screenX <= p3.x) {
			const p1x = cp1x[i];
			const p1y = cp1y[i];
			const p2x = cp2x[i];
			const p2y = cp2y[i];

			let t = (screenX - p0.x) / (p3.x - p0.x);
			for (let iter = 0; iter < 8; iter++) {
				const currentX = cubicBezier(t, p0.x, p1x, p2x, p3.x);
				const error = currentX - screenX;

				if (Math.abs(error) < 0.001) {
					break;
				}

				const oneMinusT = 1 - t;
				const derivative =
					-3 * oneMinusT * oneMinusT * p0.x +
					3 * oneMinusT * oneMinusT * p1x -
					6 * oneMinusT * t * p1x +
					6 * oneMinusT * t * p2x -
					3 * t * t * p2x +
					3 * t * t * p3.x;

				if (Math.abs(derivative) < 0.0001) {
					break;
				}

				t = t - error / derivative;
				t = Math.max(0, Math.min(1, t));
			}

			return cubicBezier(t, p0.y, p1y, p2y, p3.y);
		}
	}

	return screenPoints[screenPoints.length - 1].y;
}

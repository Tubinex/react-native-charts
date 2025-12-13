import { Skia, type SkPath } from '@shopify/react-native-skia';
import type { ScreenPoint } from './coordinateMapping';

export type CurveType = 'linear' | 'smooth';

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

export function generateLinePath(
	points: ScreenPoint[],
	curveType: CurveType = 'linear'
): SkPath {
	'worklet';
	const path = Skia.Path.Make();
	if (points.length === 0) {
		return path;
	}

	if (points.length === 1) {
		path.moveTo(points[0].x, points[0].y);
		return path;
	}

	path.moveTo(points[0].x, points[0].y);
	if (curveType === 'linear') {
		for (let i = 1; i < points.length; i++) {
			path.lineTo(points[i].x, points[i].y);
		}
	} else {
		const { cp1x, cp1y, cp2x, cp2y } = calculateMonotoneControlPoints(points);
		for (let i = 0; i < points.length - 1; i++) {
			path.cubicTo(
				cp1x[i],
				cp1y[i],
				cp2x[i],
				cp2y[i],
				points[i + 1].x,
				points[i + 1].y
			);
		}
	}

	return path;
}

export function generateAreaPath(
	points: ScreenPoint[],
	curveType: CurveType = 'linear',
	baselineY: number
): SkPath {
	'worklet';
	const path = Skia.Path.Make();
	if (points.length === 0) {
		return path;
	}

	if (points.length === 1) {
		path.moveTo(points[0].x, baselineY);
		path.lineTo(points[0].x, points[0].y);
		path.lineTo(points[0].x, baselineY);
		path.close();
		return path;
	}

	path.moveTo(points[0].x, baselineY);
	path.lineTo(points[0].x, points[0].y);

	if (curveType === 'linear') {
		for (let i = 1; i < points.length; i++) {
			path.lineTo(points[i].x, points[i].y);
		}
	} else {
		const { cp1x, cp1y, cp2x, cp2y } = calculateMonotoneControlPoints(points);

		for (let i = 0; i < points.length - 1; i++) {
			path.cubicTo(
				cp1x[i],
				cp1y[i],
				cp2x[i],
				cp2y[i],
				points[i + 1].x,
				points[i + 1].y
			);
		}
	}

	path.lineTo(points[points.length - 1].x, baselineY);
	path.close();

	return path;
}

export function splitPathAtIndex(
	points: ScreenPoint[],
	splitIndex: number,
	curveType: CurveType = 'linear',
	isAreaChart: boolean = false,
	baselineY?: number
): { activePath: SkPath; grayedPath: SkPath } {
	'worklet';
	const emptyPath = Skia.Path.Make();
	if (points.length === 0 || splitIndex < 0) {
		return { activePath: emptyPath, grayedPath: emptyPath };
	}

	const clampedIndex = Math.max(0, Math.min(splitIndex, points.length - 1));
	const activePoints = points.slice(0, clampedIndex + 1);
	const grayedPoints = points.slice(clampedIndex);

	const activePath = isAreaChart && baselineY !== undefined
		? generateAreaPath(activePoints, curveType, baselineY)
		: generateLinePath(activePoints, curveType);

	const grayedPath = isAreaChart && baselineY !== undefined
		? generateAreaPath(grayedPoints, curveType, baselineY)
		: generateLinePath(grayedPoints, curveType);

	return { activePath, grayedPath };
}

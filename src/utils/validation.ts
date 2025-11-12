import type { BarData, GroupedBarData, RadialSegment, StackedBarData } from '../types';

export function validateBarData(data: BarData[]): void {
	if (!Array.isArray(data)) {
		throw new Error('BarChart: data must be an array');
	}

	if (data.length === 0) {
		console.warn('BarChart: data array is empty');
		return;
	}

	data.forEach((item, index) => {
		if (typeof item.value !== 'number' || isNaN(item.value) || !isFinite(item.value)) {
			throw new Error(
				`BarChart: data[${index}].value must be a valid finite number, got ${item.value}`
			);
		}

		if (item.value < 0) {
			console.warn(
				`BarChart: data[${index}].value is negative (${item.value}). This may cause rendering issues.`
			);
		}

		if (typeof item.label !== 'string') {
			console.warn(
				`BarChart: data[${index}].label should be a string, got ${typeof item.label}`
			);
		}

		if (item.color !== undefined && typeof item.color !== 'string') {
			console.warn(
				`BarChart: data[${index}].color should be a string, got ${typeof item.color}`
			);
		}
	});
}

export function validateGroupedStackedBarData(data: (GroupedBarData | StackedBarData)[]): void {
	if (!Array.isArray(data)) {
		throw new Error('GroupedStackedBarChart: data must be an array');
	}

	if (data.length === 0) {
		console.warn('GroupedStackedBarChart: data array is empty');
		return;
	}

	data.forEach((item, index) => {
		if (typeof item.category !== 'string') {
			console.warn(
				`GroupedStackedBarChart: data[${index}].category should be a string, got ${typeof item.category}`
			);
		}

		if ('bars' in item) {
			if (!Array.isArray(item.bars)) {
				throw new Error(`GroupedStackedBarChart: data[${index}].bars must be an array`);
			}

			if (item.bars.length === 0) {
				console.warn(`GroupedStackedBarChart: data[${index}].bars array is empty`);
			}

			item.bars.forEach((bar, barIndex) => {
				if (typeof bar.value !== 'number' || isNaN(bar.value) || !isFinite(bar.value)) {
					throw new Error(
						`GroupedStackedBarChart: data[${index}].bars[${barIndex}].value must be a valid finite number, got ${bar.value}`
					);
				}

				if (bar.value < 0) {
					console.warn(
						`GroupedStackedBarChart: data[${index}].bars[${barIndex}].value is negative (${bar.value}). This may cause rendering issues.`
					);
				}

				if (typeof bar.color !== 'string') {
					throw new Error(
						`GroupedStackedBarChart: data[${index}].bars[${barIndex}].color must be a string`
					);
				}
			});
		} else if ('stack' in item) {
			if (!Array.isArray(item.stack)) {
				throw new Error(`GroupedStackedBarChart: data[${index}].stack must be an array`);
			}

			if (item.stack.length === 0) {
				console.warn(`GroupedStackedBarChart: data[${index}].stack array is empty`);
			}

			item.stack.forEach((segment, segmentIndex) => {
				if (
					typeof segment.value !== 'number' ||
					isNaN(segment.value) ||
					!isFinite(segment.value)
				) {
					throw new Error(
						`GroupedStackedBarChart: data[${index}].stack[${segmentIndex}].value must be a valid finite number, got ${segment.value}`
					);
				}

				if (segment.value < 0) {
					console.warn(
						`GroupedStackedBarChart: data[${index}].stack[${segmentIndex}].value is negative (${segment.value}). This may cause rendering issues.`
					);
				}

				if (typeof segment.color !== 'string') {
					throw new Error(
						`GroupedStackedBarChart: data[${index}].stack[${segmentIndex}].color must be a string`
					);
				}
			});
		} else {
			throw new Error(
				`GroupedStackedBarChart: data[${index}] must have either 'bars' or 'stack' property`
			);
		}
	});
}

export function validateRadialSegments(segments: RadialSegment[]): void {
	if (!Array.isArray(segments)) {
		throw new Error('RadialChart: segments must be an array');
	}

	if (segments.length === 0) {
		console.warn('RadialChart: segments array is empty');
		return;
	}

	segments.forEach((segment, index) => {
		if (typeof segment.value !== 'number' || isNaN(segment.value) || !isFinite(segment.value)) {
			throw new Error(
				`RadialChart: segments[${index}].value must be a valid finite number, got ${segment.value}`
			);
		}

		if (segment.value < 0) {
			console.warn(
				`RadialChart: segments[${index}].value is negative (${segment.value}). This may cause rendering issues.`
			);
		}

		if (typeof segment.color !== 'string') {
			throw new Error(`RadialChart: segments[${index}].color must be a string`);
		}
	});
}

export function validateNumericProp(
	value: number | undefined,
	propName: string,
	componentName: string
): void {
	if (value === undefined) {
		return;
	}

	if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
		throw new Error(
			`${componentName}: ${propName} must be a valid finite number, got ${value}`
		);
	}

	if (value < 0) {
		console.warn(
			`${componentName}: ${propName} is negative (${value}). This may cause rendering issues.`
		);
	}
}

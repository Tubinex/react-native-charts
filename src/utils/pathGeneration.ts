import type { CornerRadius } from '../types';

export function generateBarPath(
	scaledX: number,
	scaledY: number,
	scaledWidth: number,
	scaledHeight: number,
	topLeftRadius: number,
	topRightRadius: number,
	bottomLeftRadius: number,
	bottomRightRadius: number
): string {
	'worklet';

	let path = `M ${scaledX + topLeftRadius},${scaledY}`;
	path += ` L ${scaledX + scaledWidth - topRightRadius},${scaledY}`;

	if (topRightRadius > 0) {
		path += ` Q ${scaledX + scaledWidth},${scaledY} ${scaledX + scaledWidth},${scaledY + topRightRadius}`;
	}

	path += ` L ${scaledX + scaledWidth},${scaledY + scaledHeight - bottomRightRadius}`;
	if (bottomRightRadius > 0) {
		path += ` Q ${scaledX + scaledWidth},${scaledY + scaledHeight} ${scaledX + scaledWidth - bottomRightRadius},${scaledY + scaledHeight}`;
	}

	path += ` L ${scaledX + bottomLeftRadius},${scaledY + scaledHeight}`;
	if (bottomLeftRadius > 0) {
		path += ` Q ${scaledX},${scaledY + scaledHeight} ${scaledX},${scaledY + scaledHeight - bottomLeftRadius}`;
	}

	path += ` L ${scaledX},${scaledY + topLeftRadius}`;
	if (topLeftRadius > 0) {
		path += ` Q ${scaledX},${scaledY} ${scaledX + topLeftRadius},${scaledY}`;
	}

	path += ' Z';
	return path;
}

export function parseCornerRadius(
	cornerRadiusProp: CornerRadius,
	scaledWidth: number,
	scaledHeight: number,
	applyBottomRadius: boolean = false
): {
	topLeft: number;
	topRight: number;
	bottomLeft: number;
	bottomRight: number;
} {
	'worklet';

	let topLeftRadius = 0;
	let topRightRadius = 0;
	let bottomLeftRadius = 0;
	let bottomRightRadius = 0;

	if (typeof cornerRadiusProp === 'number') {
		topLeftRadius = topRightRadius = cornerRadiusProp;
		bottomLeftRadius = bottomRightRadius = applyBottomRadius ? cornerRadiusProp : 0;
	} else if (cornerRadiusProp && 'top' in cornerRadiusProp) {
		topLeftRadius = topRightRadius = cornerRadiusProp.top;
		bottomLeftRadius = bottomRightRadius = cornerRadiusProp.bottom;
	} else if (cornerRadiusProp) {
		topLeftRadius = cornerRadiusProp.topLeft;
		topRightRadius = cornerRadiusProp.topRight;
		bottomLeftRadius = cornerRadiusProp.bottomLeft;
		bottomRightRadius = cornerRadiusProp.bottomRight;
	}

	const maxRadius = Math.min(scaledWidth / 2, scaledHeight / 2);
	topLeftRadius = Math.min(topLeftRadius, maxRadius);
	topRightRadius = Math.min(topRightRadius, maxRadius);
	bottomLeftRadius = Math.min(bottomLeftRadius, maxRadius);
	bottomRightRadius = Math.min(bottomRightRadius, maxRadius);

	return {
		topLeft: topLeftRadius,
		topRight: topRightRadius,
		bottomLeft: bottomLeftRadius,
		bottomRight: bottomRightRadius,
	};
}

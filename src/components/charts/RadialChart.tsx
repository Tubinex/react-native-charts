import React, { useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, type GestureResponderEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path, G } from 'react-native-svg';
import Animated, {
	useSharedValue,
	useAnimatedProps,
	withTiming,
	Easing,
	type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { RadialGraphProps } from '../../types';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const normalizeAngle = (angle: number) => {
	const normalized = angle % 360;
	return normalized < 0 ? normalized + 360 : normalized;
};

const isAngleWithinArc = (angle: number, startAngle: number, sweepAngle: number) => {
	if (sweepAngle === 0) {
		return false;
	}

	if (Math.abs(sweepAngle) >= 360) {
		return true;
	}

	const normalizedAngle = normalizeAngle(angle);
	const normalizedStart = normalizeAngle(startAngle);
	const normalizedEnd = normalizeAngle(startAngle + sweepAngle);

	if (normalizedEnd >= normalizedStart) {
		return normalizedAngle >= normalizedStart && normalizedAngle <= normalizedEnd;
	}

	return normalizedAngle >= normalizedStart || normalizedAngle <= normalizedEnd;
};

export const RadialChart: React.FC<RadialGraphProps> = ({
	segments,
	maxValue: maxValueProp,
	size = 280,
	strokeWidth = 40,
	cornerRadius = 8,
	segmentGap = 0,
	backgroundColor,
	animationDuration = 1200,
	startAngle = -90,
	sweepAngle = 360,
	viewBoxHeightRatio = 1,
	centerContent,
	contentAlignment = 'center',
	onSegmentPress,
	selectedSegmentIndex = -1,
	selectedStrokeWidthIncrease = 15,
	selectionAnimationDuration = 200,
	selectionExpandMode = 'expand',
	onPressOutside,
	chartGestureRef,
}) => {
	const progress = useSharedValue(0);
	useEffect(() => {
		progress.value = withTiming(1, {
			duration: animationDuration,
			easing: Easing.bezier(0.25, 0.1, 0.25, 1),
		});
	}, [animationDuration]);

	const expandedStrokeWidth = strokeWidth + selectedStrokeWidthIncrease;
	const padding =
		selectionExpandMode === 'expand'
			? selectedStrokeWidthIncrease
			: selectedStrokeWidthIncrease / 2;
	const effectiveSize = size + padding * 2;

	const radius = (size - strokeWidth) / 2;
	const center = effectiveSize / 2;
	const viewBoxHeight = effectiveSize * viewBoxHeightRatio;

	const baseHitStrokeWidth = strokeWidth + 20;
	const hitStrokeWidth = Math.max(baseHitStrokeWidth, expandedStrokeWidth);
	const innerHitRadius = Math.max(0, radius - hitStrokeWidth / 2);
	const outerHitRadius = radius + hitStrokeWidth / 2;

	const totalValue = segments.reduce((sum, seg) => sum + seg.value, 0);
	const maxValueCalc = maxValueProp || totalValue;
	const percentage = Math.min(Math.max((totalValue / maxValueCalc) * 100, 0), 100);

	const hasGap = segmentGap > 0;
	const needsBackgroundSegment = percentage < 100 && backgroundColor;
	const totalSegments = segments.length + (needsBackgroundSegment ? 1 : 0);
	const closedLoop = Math.abs(sweepAngle) >= 360;
	const numGaps = closedLoop && hasGap ? totalSegments : Math.max(0, totalSegments - 1);
	const totalGapDegrees = hasGap ? segmentGap * numGaps : 0;
	const availableDegrees = sweepAngle - totalGapDegrees;

	let currentAngle = startAngle;
	let cumulativePercentage = 0;
	const segmentData = segments.map((segment, index) => {
		const segmentPercentage = segment.value / maxValueCalc;
		const segmentDegrees = availableDegrees * segmentPercentage;
		const isSelected = index === selectedSegmentIndex;

		const data = {
			...segment,
			startAngle: currentAngle,
			sweepAngle: segmentDegrees,
			percentage: segmentPercentage,
			animationStart: cumulativePercentage,
			animationEnd: cumulativePercentage + segmentPercentage,
			baseStrokeWidth: strokeWidth,
			selectedStrokeWidth: expandedStrokeWidth,
			isSelected,
			index,
		};

		currentAngle += segmentDegrees + (hasGap ? segmentGap : 0);
		cumulativePercentage += segmentPercentage;
		return data;
	});

	const backgroundPercentage = needsBackgroundSegment ? 1 - percentage / 100 : 0;
	const backgroundSegment = needsBackgroundSegment
		? {
			startAngle: currentAngle,
			sweepAngle: startAngle + sweepAngle - currentAngle,
			color: backgroundColor!,
			animationStart: cumulativePercentage,
			animationEnd: cumulativePercentage + backgroundPercentage,
		}
		: null;

	const innerRadius = radius - strokeWidth / 2;
	const contentBoxSize = innerRadius * 2 * 0.9;

	const getSegmentIndexForPoint = useCallback(
		(x: number, y: number) => {
			if (!segmentData.length) {
				return -1;
			}

			const dx = x - center;
			const dy = y - center;
			const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

			if (distanceFromCenter < innerHitRadius || distanceFromCenter > outerHitRadius) {
				return -1;
			}

			const angleFromCenter = normalizeAngle((Math.atan2(dy, dx) * 180) / Math.PI);

			for (const segment of segmentData) {
				if (segment.sweepAngle <= 0) {
					continue;
				}

				if (isAngleWithinArc(angleFromCenter, segment.startAngle, segment.sweepAngle)) {
					return segment.index;
				}
			}

			return -1;
		},
		[center, innerHitRadius, outerHitRadius, segmentData]
	);

	const tapStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
	const deselectTouchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

	const handleSegmentTap = useCallback(
		(x: number, y: number) => {
			const index = getSegmentIndexForPoint(x, y);
			if (index !== -1 && onSegmentPress) {
				onSegmentPress(index);
			}
		},
		[getSegmentIndexForPoint, onSegmentPress]
	);

	const hasInteractiveSegments = segmentData.some(segment => segment.sweepAngle > 0);

	let tapGesture = Gesture.Tap()
		.enabled(!!onSegmentPress && hasInteractiveSegments)
		.maxDistance(18)
		.maxDuration(280)
		.onBegin(event => {
			tapStartRef.current = { x: event.x, y: event.y, time: Date.now() };
		})
		.onEnd(event => {
			'worklet';
			if (!onSegmentPress) {
				return;
			}

			const start = tapStartRef.current;
			tapStartRef.current = null;

			if (start) {
				const dx = event.x - start.x;
				const dy = event.y - start.y;
				const distSquared = dx * dx + dy * dy;

				if (distSquared > 18 * 18) {
					return;
				}

				if (Math.abs(dy) > Math.abs(dx) * 1.5 && Math.abs(dy) > 5) {
					return;
				}
			}

			scheduleOnRN(handleSegmentTap, event.x, event.y);
		})
		.onFinalize(() => {
			tapStartRef.current = null;
		});

	if (chartGestureRef) {
		tapGesture = tapGesture.withRef(chartGestureRef);
	}

	const handleTouchStart = useCallback(
		(event: GestureResponderEvent) => {
			if (!onPressOutside || selectedSegmentIndex === -1) {
				return;
			}
			const { locationX, locationY } = event.nativeEvent;
			deselectTouchStartRef.current = { x: locationX, y: locationY, time: Date.now() };
		},
		[onPressOutside, selectedSegmentIndex]
	);

	const handleTouchEnd = useCallback(
		(event: GestureResponderEvent) => {
			if (!onPressOutside || selectedSegmentIndex === -1) {
				return;
			}

			const start = deselectTouchStartRef.current;
			deselectTouchStartRef.current = null;

			if (!start) {
				return;
			}

			const { locationX, locationY } = event.nativeEvent;
			const dx = locationX - start.x;
			const dy = locationY - start.y;
			const distance = Math.sqrt(dx * dx + dy * dy);
			const duration = Date.now() - start.time;

			if (distance < 18 && duration < 280) {
				const index = getSegmentIndexForPoint(locationX, locationY);
				if (index === -1) {
					setTimeout(() => {
						onPressOutside();
					}, 10);
				}
			}
		},
		[
			onPressOutside,
			selectedSegmentIndex,
			getSegmentIndexForPoint,
		]
	);

	const deselectTouchEnabled = !!onPressOutside && selectedSegmentIndex !== -1;

	const getContentBoxStyle = () => {
		if (sweepAngle === 360) {
			return {
				width: contentBoxSize,
				height: contentBoxSize,
				top: center - contentBoxSize / 2,
				left: center - contentBoxSize / 2,
			};
		} else if (sweepAngle === 180) {
			if (startAngle === -180) {
				const bottomOfSegments = center;
				return {
					width: contentBoxSize,
					height: contentBoxSize * 0.5,
					bottom: viewBoxHeight - bottomOfSegments,
					left: center - contentBoxSize / 2,
				};
			} else {
				return {
					width: contentBoxSize,
					height: contentBoxSize * 0.5,
					top: center - contentBoxSize * 0.5,
					left: center - contentBoxSize / 2,
				};
			}
		} else {
			return {
				width: contentBoxSize,
				height: contentBoxSize,
				top: center - contentBoxSize / 2,
				left: center - contentBoxSize / 2,
			};
		}
	};

	const chartContent = (
		<View
			style={[
				styles.container,
				{
					width: effectiveSize,
					height: viewBoxHeight,
					margin: -padding,
				},
			]}
			onTouchStart={deselectTouchEnabled ? handleTouchStart : undefined}
			onTouchEnd={deselectTouchEnabled ? handleTouchEnd : undefined}
		>
			<GestureDetector gesture={tapGesture}>
				<Svg
					width={effectiveSize}
					height={viewBoxHeight}
					viewBox={`0 0 ${effectiveSize} ${viewBoxHeight}`}
				>
					<G>
						{!hasGap && needsBackgroundSegment && (
							<RadialSegmentPath
								cx={center}
								cy={center}
								radius={radius}
								strokeWidth={strokeWidth}
								color={backgroundColor!}
								startAngle={startAngle}
								sweepAngle={sweepAngle}
								cornerRadius={cornerRadius}
							/>
						)}

						{segmentData.map((segment, index) => (
							<AnimatedRadialSegment
								key={index}
								cx={center}
								cy={center}
								radius={radius}
								baseStrokeWidth={segment.baseStrokeWidth}
								selectedStrokeWidth={segment.selectedStrokeWidth}
								color={segment.color}
								startAngle={segment.startAngle}
								sweepAngle={segment.sweepAngle}
								cornerRadius={cornerRadius}
								progress={progress}
								isSelected={segment.isSelected}
								selectionAnimationDuration={selectionAnimationDuration}
								selectionExpandMode={selectionExpandMode}
								animationDuration={animationDuration}
								animationStart={segment.animationStart}
								animationEnd={segment.animationEnd}
							/>
						))}

						{hasGap && backgroundSegment && (
							<AnimatedRadialSegment
								cx={center}
								cy={center}
								radius={radius}
								strokeWidth={strokeWidth}
								color={backgroundSegment.color}
								startAngle={backgroundSegment.startAngle}
								sweepAngle={backgroundSegment.sweepAngle}
								cornerRadius={cornerRadius}
								progress={progress}
								animationDuration={animationDuration}
								animationStart={backgroundSegment.animationStart}
								animationEnd={backgroundSegment.animationEnd}
							/>
						)}
					</G>
				</Svg>
			</GestureDetector>
			{centerContent && (
				<View
					style={[
						styles.contentBox,
						getContentBoxStyle(),
						{ justifyContent: contentAlignment },
					]}
				>
					{centerContent}
				</View>
			)}
		</View>
	);

	return chartContent;
};

interface RadialSegmentPathProps {
	cx: number;
	cy: number;
	radius: number;
	strokeWidth: number;
	color: string;
	startAngle: number;
	sweepAngle: number;
	cornerRadius: number;
}

const RadialSegmentPath: React.FC<RadialSegmentPathProps> = ({
	cx,
	cy,
	radius,
	strokeWidth,
	color,
	startAngle,
	sweepAngle,
	cornerRadius,
}) => {
	const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

	const polarToCartesian = (angle: number, r: number) => {
		const rad = toRadians(angle);
		return {
			x: cx + r * Math.cos(rad),
			y: cy + r * Math.sin(rad),
		};
	};

	const outerRadius = radius + strokeWidth / 2;
	const innerRadius = radius - strokeWidth / 2;
	const maxCornerRadius = Math.min(cornerRadius, strokeWidth / 2 - 1);

	const endAngle = startAngle + sweepAngle;

	const angleOffset = (maxCornerRadius / outerRadius) * (180 / Math.PI);

	const outerStartOffset = polarToCartesian(startAngle + angleOffset, outerRadius);
	const innerEndOffset = polarToCartesian(startAngle + angleOffset, innerRadius);

	const outerEndOffset = polarToCartesian(endAngle - angleOffset, outerRadius);
	const innerStartOffset = polarToCartesian(endAngle - angleOffset, innerRadius);

	const radiusOffset = maxCornerRadius;
	const outerStartRadial = polarToCartesian(startAngle, outerRadius - radiusOffset);
	const innerEndRadial = polarToCartesian(startAngle, innerRadius + radiusOffset);

	const outerEndRadial = polarToCartesian(endAngle, outerRadius - radiusOffset);
	const innerStartRadial = polarToCartesian(endAngle, innerRadius + radiusOffset);

	const largeArcFlag = sweepAngle > 180 ? 1 : 0;

	const path = `
    M ${outerStartRadial.x} ${outerStartRadial.y}
    A ${maxCornerRadius} ${maxCornerRadius} 0 0 1 ${outerStartOffset.x} ${outerStartOffset.y}
    A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEndOffset.x} ${outerEndOffset.y}
    A ${maxCornerRadius} ${maxCornerRadius} 0 0 1 ${outerEndRadial.x} ${outerEndRadial.y}
    L ${innerStartRadial.x} ${innerStartRadial.y}
    A ${maxCornerRadius} ${maxCornerRadius} 0 0 1 ${innerStartOffset.x} ${innerStartOffset.y}
    A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerEndOffset.x} ${innerEndOffset.y}
    A ${maxCornerRadius} ${maxCornerRadius} 0 0 1 ${innerEndRadial.x} ${innerEndRadial.y}
    Z
  `;

	return <Path d={path} fill={color} />;
};

interface AnimatedRadialSegmentProps {
	cx: number;
	cy: number;
	radius: number;
	color: string;
	startAngle: number;
	sweepAngle: number;
	cornerRadius: number;
	progress: SharedValue<number>;
	animationDuration: number;
	animationStart: number;
	animationEnd: number;
	strokeWidth?: number;
	baseStrokeWidth?: number;
	selectedStrokeWidth?: number;
	isSelected?: boolean;
	selectionAnimationDuration?: number;
	selectionExpandMode?: 'scale' | 'expand';
}

const AnimatedRadialSegment: React.FC<AnimatedRadialSegmentProps> = ({
	cx,
	cy,
	radius,
	color,
	startAngle,
	sweepAngle,
	cornerRadius,
	progress,
	animationDuration,
	animationStart,
	animationEnd,
	strokeWidth: staticStrokeWidth,
	baseStrokeWidth,
	selectedStrokeWidth,
	isSelected = false,
	selectionAnimationDuration = 200,
	selectionExpandMode = 'expand',
}) => {
	const isSelectionSegment = baseStrokeWidth !== undefined && selectedStrokeWidth !== undefined;
	const segmentProgress = useSharedValue(0);
	const mySelectionProgress = useSharedValue(isSelected ? 1 : 0);

	useEffect(() => {
		segmentProgress.value = withTiming(1, {
			duration: animationDuration,
			easing: Easing.bezier(0.25, 0.1, 0.25, 1),
		});
	}, [animationDuration]);

	useEffect(() => {
		if (!isSelectionSegment) {
			return;
		}

		mySelectionProgress.value = withTiming(isSelected ? 1 : 0, {
			duration: selectionAnimationDuration,
			easing: Easing.linear,
		});
	}, [isSelected, isSelectionSegment, selectionAnimationDuration]);

	const animatedProps = useAnimatedProps(() => {
		'worklet';

		const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

		const polarToCartesian = (angle: number, r: number) => {
			const rad = toRadians(angle);
			return {
				x: cx + r * Math.cos(rad),
				y: cy + r * Math.sin(rad),
			};
		};

		const globalProgress = segmentProgress.value;
		let localProgress = 0;

		if (globalProgress <= animationStart) {
			localProgress = 0;
		} else if (globalProgress >= animationEnd) {
			localProgress = 1;
		} else {
			const segmentDuration = animationEnd - animationStart;
			localProgress = (globalProgress - animationStart) / segmentDuration;
		}

		const currentSweep = sweepAngle * localProgress;

		if (currentSweep <= 0.01) {
			return { d: '' };
		}

		let currentStrokeWidth: number;
		let currentRadius = radius;

		if (isSelectionSegment) {
			const selProg = mySelectionProgress.value;
			const strokeWidthIncrease = selectedStrokeWidth! - baseStrokeWidth!;
			currentStrokeWidth = baseStrokeWidth! + strokeWidthIncrease * selProg;
			if (selectionExpandMode === 'expand') {
				currentRadius = radius + (strokeWidthIncrease / 2) * selProg;
			}
		} else {
			currentStrokeWidth = staticStrokeWidth!;
		}

		const outerRadius = currentRadius + currentStrokeWidth / 2;
		const innerRadius = currentRadius - currentStrokeWidth / 2;
		const maxCornerRadius = Math.min(cornerRadius, currentStrokeWidth / 2 - 1);

		const endAngle = startAngle + currentSweep;

		const angleOffset = (maxCornerRadius / outerRadius) * (180 / Math.PI);

		const outerStartOffset = polarToCartesian(startAngle + angleOffset, outerRadius);
		const innerEndOffset = polarToCartesian(startAngle + angleOffset, innerRadius);

		const outerEndOffset = polarToCartesian(endAngle - angleOffset, outerRadius);
		const innerStartOffset = polarToCartesian(endAngle - angleOffset, innerRadius);

		const radiusOffset = maxCornerRadius;
		const outerStartRadial = polarToCartesian(startAngle, outerRadius - radiusOffset);
		const innerEndRadial = polarToCartesian(startAngle, innerRadius + radiusOffset);

		const outerEndRadial = polarToCartesian(endAngle, outerRadius - radiusOffset);
		const innerStartRadial = polarToCartesian(endAngle, innerRadius + radiusOffset);

		const largeArcFlag = currentSweep > 180 ? 1 : 0;

		const path = `
      M ${outerStartRadial.x} ${outerStartRadial.y}
      A ${maxCornerRadius} ${maxCornerRadius} 0 0 1 ${outerStartOffset.x} ${outerStartOffset.y}
      A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEndOffset.x} ${outerEndOffset.y}
      A ${maxCornerRadius} ${maxCornerRadius} 0 0 1 ${outerEndRadial.x} ${outerEndRadial.y}
      L ${innerStartRadial.x} ${innerStartRadial.y}
      A ${maxCornerRadius} ${maxCornerRadius} 0 0 1 ${innerStartOffset.x} ${innerStartOffset.y}
      A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${innerEndOffset.x} ${innerEndOffset.y}
      A ${maxCornerRadius} ${maxCornerRadius} 0 0 1 ${innerEndRadial.x} ${innerEndRadial.y}
      Z
    `;

		return { d: path };
	});

	return <AnimatedPath fill={color} animatedProps={animatedProps} />;
};

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		justifyContent: 'center',
		alignSelf: 'center',
	},
	contentBox: {
		position: 'absolute',
		alignItems: 'center',
		justifyContent: 'center',
	},
});

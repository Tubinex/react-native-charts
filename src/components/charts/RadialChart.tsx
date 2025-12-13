import React, { useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Canvas, Path, Group } from '@shopify/react-native-skia';
import {
	useSharedValue,
	useDerivedValue,
	withTiming,
	Easing,
	type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { ChartPressOutsideEvent, RadialChartProps } from '../../types';
import { useGlobalTouchEvents, type GlobalTouchPoint } from '../../context/GlobalTouchProvider';
import { validateRadialSegments } from '../../utils/validation';
import { TOUCH_CONFIG, TOUCH_CONFIG_SQUARED } from '../../utils/constants';
import { useChartAnimation } from '../../utils/hooks';

type BasePressOutsideEvent = Omit<ChartPressOutsideEvent, 'preventDefault' | 'defaultPrevented'>;

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

export const RadialChart: React.FC<RadialChartProps> = ({
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
	deselectOnPressOutside = false,
}) => {
	validateRadialSegments(segments);

	const progress = useChartAnimation(animationDuration);

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
	const hasBackgroundColor = Boolean(backgroundColor);
	const needsBackgroundSegment = hasBackgroundColor && percentage < 100;
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
		.maxDistance(TOUCH_CONFIG.TAP_MAX_DISTANCE)
		.maxDuration(TOUCH_CONFIG.TAP_MAX_DURATION)
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

				if (distSquared > TOUCH_CONFIG_SQUARED.TAP_DISTANCE_SQ) {
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

	type ChartBounds = { x: number; y: number; width: number; height: number };

	type TouchTrackingState = {
		startAbsoluteX: number;
		startAbsoluteY: number;
		lastAbsoluteX: number;
		lastAbsoluteY: number;
		bounds: ChartBounds;
		insideOnStart: boolean;
		triggered: boolean;
	};

	const containerRef = useRef<View | null>(null);
	const chartBoundsRef = useRef<ChartBounds | null>(null);
	const touchStatesRef = useRef<Map<number, TouchTrackingState>>(new Map());
	const deselectTriggeredRef = useRef(false);
	const selectedIndexRef = useRef(selectedSegmentIndex);
	const onPressOutsideRef = useRef(onPressOutside);
	const autoDeselectValue = deselectOnPressOutside;
	const autoDeselectRef = useRef(autoDeselectValue);
	const globalTouchEvents = useGlobalTouchEvents();

	const measureChartBounds = useCallback((afterMeasure?: (bounds: ChartBounds) => void) => {
		const view = containerRef.current;
		if (!view) {
			return;
		}

		view.measureInWindow((x, y, width, height) => {
			const bounds = { x, y, width, height };
			chartBoundsRef.current = bounds;
			afterMeasure?.(bounds);
		});
	}, []);

	const handleContainerLayout = useCallback(
		(_: LayoutChangeEvent) => {
			measureChartBounds();
		},
		[measureChartBounds]
	);

	const isPointInsideBounds = useCallback((x: number, y: number, bounds: ChartBounds) => {
		return (
			x >= bounds.x &&
			x <= bounds.x + bounds.width &&
			y >= bounds.y &&
			y <= bounds.y + bounds.height
		);
	}, []);

	const triggerDeselect = useCallback(
		(eventData: BasePressOutsideEvent) => {
			if (deselectTriggeredRef.current) {
				return;
			}

			deselectTriggeredRef.current = true;

			const enrichedEvent: ChartPressOutsideEvent = {
				...eventData,
				defaultPrevented: false,
				preventDefault: () => {
					enrichedEvent.defaultPrevented = true;
				},
			};

			if (onPressOutsideRef.current) {
				onPressOutsideRef.current(enrichedEvent);
			}

			if (enrichedEvent.defaultPrevented) {
				deselectTriggeredRef.current = false;
				return;
			}

			if (autoDeselectRef.current && onSegmentPress) {
				scheduleOnRN(onSegmentPress, -1);
			}
		},
		[onSegmentPress]
	);

	useEffect(() => {
		autoDeselectRef.current = autoDeselectValue;
	}, [autoDeselectValue]);

	useEffect(() => {
		onPressOutsideRef.current = onPressOutside;
	}, [onPressOutside]);

	useEffect(() => {
		selectedIndexRef.current = selectedSegmentIndex;
		if (selectedSegmentIndex === -1) {
			deselectTriggeredRef.current = false;
			touchStatesRef.current.clear();
		} else {
			deselectTriggeredRef.current = false;
		}
	}, [selectedSegmentIndex]);

	useEffect(() => {
		const timeout = setTimeout(() => {
			measureChartBounds();
		}, 0);

		return () => {
			clearTimeout(timeout);
		};
	}, [measureChartBounds]);

	useEffect(() => {
		measureChartBounds();
	}, [effectiveSize, viewBoxHeight, measureChartBounds]);

	useEffect(() => {
		if (!globalTouchEvents) {
			return;
		}

		const unsubscribe = globalTouchEvents.subscribe(event => {
			if (
				selectedIndexRef.current === -1 ||
				(!onPressOutsideRef.current && !autoDeselectRef.current)
			) {
				return;
			}

			const emitDeselect = (
				state: TouchTrackingState,
				trigger: 'move' | 'release',
				touch: GlobalTouchPoint
			) => {
				if (state.triggered) {
					return;
				}

				state.triggered = true;
				const bounds = state.bounds;
				const eventData: BasePressOutsideEvent = {
					absoluteX: touch.absoluteX,
					absoluteY: touch.absoluteY,
					localX: touch.absoluteX - bounds.x,
					localY: touch.absoluteY - bounds.y,
					startedInside: state.insideOnStart,
					trigger,
					touchId: touch.id,
					timestamp: event.timestamp,
				};

				triggerDeselect(eventData);
			};

			event.touches.forEach(touch => {
				if (event.type === 'down') {
					const assignState = (bounds: ChartBounds) => {
						const inside = isPointInsideBounds(
							touch.absoluteX,
							touch.absoluteY,
							bounds
						);
						touchStatesRef.current.set(touch.id, {
							startAbsoluteX: touch.absoluteX,
							startAbsoluteY: touch.absoluteY,
							lastAbsoluteX: touch.absoluteX,
							lastAbsoluteY: touch.absoluteY,
							bounds,
							insideOnStart: inside,
							triggered: false,
						});
					};

					const currentBounds = chartBoundsRef.current;
					if (currentBounds) {
						assignState(currentBounds);
						measureChartBounds();
					} else {
						measureChartBounds(assignState);
					}
					return;
				}

				const state = touchStatesRef.current.get(touch.id);
				if (!state) {
					return;
				}

				if (event.type === 'move') {
					state.lastAbsoluteX = touch.absoluteX;
					state.lastAbsoluteY = touch.absoluteY;

					if (!state.triggered) {
						const dx = touch.absoluteX - state.startAbsoluteX;
						const dy = touch.absoluteY - state.startAbsoluteY;
						const distanceSq = dx * dx + dy * dy;

						if (distanceSq >= TOUCH_CONFIG_SQUARED.MOVEMENT_THRESHOLD_SQ) {
							emitDeselect(state, 'move', touch);
						}
					}
					return;
				}

				touchStatesRef.current.delete(touch.id);

				if (event.type === 'cancel') {
					return;
				}

				if (state.triggered) {
					return;
				}

				const dx = touch.absoluteX - state.startAbsoluteX;
				const dy = touch.absoluteY - state.startAbsoluteY;
				const distanceSq = dx * dx + dy * dy;

				if (distanceSq > TOUCH_CONFIG_SQUARED.TAP_DISTANCE_SQ) {
					return;
				}

				if (!state.insideOnStart) {
					emitDeselect(state, 'release', touch);
					return;
				}

				const bounds = state.bounds;
				const insideBounds = isPointInsideBounds(touch.absoluteX, touch.absoluteY, bounds);

				if (!insideBounds) {
					emitDeselect(state, 'release', touch);
					return;
				}

				const localX = touch.absoluteX - bounds.x;
				const localY = touch.absoluteY - bounds.y;
				const segmentIndex = getSegmentIndexForPoint(localX, localY);

				if (segmentIndex === -1) {
					emitDeselect(state, 'release', touch);
				}
			});
		});

		return () => {
			unsubscribe();
		};
	}, [
		globalTouchEvents,
		getSegmentIndexForPoint,
		isPointInsideBounds,
		measureChartBounds,
		triggerDeselect,
	]);

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
			ref={containerRef}
			style={[
				styles.container,
				{
					width: effectiveSize,
					height: viewBoxHeight,
					margin: -padding,
				},
			]}
			onLayout={handleContainerLayout}
		>
			<GestureDetector gesture={tapGesture}>
				<Canvas style={{ width: effectiveSize, height: viewBoxHeight }}>
					<Group>
						{!hasGap && hasBackgroundColor && (
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
								isClosedLoop={closedLoop}
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
								isClosedLoop={false}
							/>
						)}
					</Group>
				</Canvas>
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

	if (Math.abs(sweepAngle) >= 360) {
		const outerStart = polarToCartesian(startAngle, outerRadius);
		const outerMid = polarToCartesian(startAngle + 180, outerRadius);
		const innerStart = polarToCartesian(startAngle, innerRadius);
		const innerMid = polarToCartesian(startAngle + 180, innerRadius);

		const pathFull = `
      M ${outerStart.x} ${outerStart.y}
      A ${outerRadius} ${outerRadius} 0 1 1 ${outerMid.x} ${outerMid.y}
      A ${outerRadius} ${outerRadius} 0 1 1 ${outerStart.x} ${outerStart.y}
      M ${innerStart.x} ${innerStart.y}
      A ${innerRadius} ${innerRadius} 0 1 0 ${innerMid.x} ${innerMid.y}
      A ${innerRadius} ${innerRadius} 0 1 0 ${innerStart.x} ${innerStart.y}
      Z
    `;
		return <Path path={pathFull} color={color} style="fill" />;
	}

	if (Math.abs(sweepAngle) > 180) {
		const midAngle = startAngle + sweepAngle / 2;
		const outerMid = polarToCartesian(midAngle, outerRadius);
		const innerMid = polarToCartesian(midAngle, innerRadius);

		const pathLarge = `
      M ${outerStartRadial.x} ${outerStartRadial.y}
      A ${maxCornerRadius} ${maxCornerRadius} 0 0 1 ${outerStartOffset.x} ${outerStartOffset.y}
      A ${outerRadius} ${outerRadius} 0 0 1 ${outerMid.x} ${outerMid.y}
      A ${outerRadius} ${outerRadius} 0 0 1 ${outerEndOffset.x} ${outerEndOffset.y}
      A ${maxCornerRadius} ${maxCornerRadius} 0 0 1 ${outerEndRadial.x} ${outerEndRadial.y}
      L ${innerStartRadial.x} ${innerStartRadial.y}
      A ${maxCornerRadius} ${maxCornerRadius} 0 0 1 ${innerStartOffset.x} ${innerStartOffset.y}
      A ${innerRadius} ${innerRadius} 0 0 0 ${innerMid.x} ${innerMid.y}
      A ${innerRadius} ${innerRadius} 0 0 0 ${innerEndOffset.x} ${innerEndOffset.y}
      A ${maxCornerRadius} ${maxCornerRadius} 0 0 1 ${innerEndRadial.x} ${innerEndRadial.y}
      Z
    `;
		return <Path path={pathLarge} color={color} style="fill" />;
	}

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

	return <Path path={path} color={color} style="fill" />;
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
	isClosedLoop?: boolean;
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
	isClosedLoop = false,
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

	const pathString = useDerivedValue(() => {
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
			return '';
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

		let effectiveCornerRadius = cornerRadius;
		if (isClosedLoop && currentSweep > 350) {
			const reductionStart = 350;
			const reductionEnd = 358;
			const reductionRange = reductionEnd - reductionStart;
			const reductionProgress = Math.min(1, Math.max(0, (currentSweep - reductionStart) / reductionRange));
			effectiveCornerRadius = cornerRadius * (1 - reductionProgress);
		}

		const maxCornerRadius = Math.min(effectiveCornerRadius, currentStrokeWidth / 2 - 1);
		const endAngle = startAngle + currentSweep;

		if (currentSweep >= 360) {
			const outerStart = polarToCartesian(startAngle, outerRadius);
			const outerMid = polarToCartesian(startAngle + 180, outerRadius);
			const innerStart = polarToCartesian(startAngle, innerRadius);
			const innerMid = polarToCartesian(startAngle + 180, innerRadius);

			const path = `
        M ${outerStart.x} ${outerStart.y}
        A ${outerRadius} ${outerRadius} 0 1 1 ${outerMid.x} ${outerMid.y}
        A ${outerRadius} ${outerRadius} 0 1 1 ${outerStart.x} ${outerStart.y}
        M ${innerStart.x} ${innerStart.y}
        A ${innerRadius} ${innerRadius} 0 1 0 ${innerMid.x} ${innerMid.y}
        A ${innerRadius} ${innerRadius} 0 1 0 ${innerStart.x} ${innerStart.y}
        Z
      `;
			return path;
		}

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

		if (Math.abs(currentSweep) > 180 && currentSweep < 360) {
			const midAngle = startAngle + currentSweep / 2;
			const outerMid = polarToCartesian(midAngle, outerRadius);
			const innerMid = polarToCartesian(midAngle, innerRadius);

			const pathLarge = `
        M ${outerStartRadial.x} ${outerStartRadial.y}
        A ${maxCornerRadius} ${maxCornerRadius} 0 0 1 ${outerStartOffset.x} ${outerStartOffset.y}
        A ${outerRadius} ${outerRadius} 0 0 1 ${outerMid.x} ${outerMid.y}
        A ${outerRadius} ${outerRadius} 0 0 1 ${outerEndOffset.x} ${outerEndOffset.y}
        A ${maxCornerRadius} ${maxCornerRadius} 0 0 1 ${outerEndRadial.x} ${outerEndRadial.y}
        L ${innerStartRadial.x} ${innerStartRadial.y}
        A ${maxCornerRadius} ${maxCornerRadius} 0 0 1 ${innerStartOffset.x} ${innerStartOffset.y}
        A ${innerRadius} ${innerRadius} 0 0 0 ${innerMid.x} ${innerMid.y}
        A ${innerRadius} ${innerRadius} 0 0 0 ${innerEndOffset.x} ${innerEndOffset.y}
        A ${maxCornerRadius} ${maxCornerRadius} 0 0 1 ${innerEndRadial.x} ${innerEndRadial.y}
        Z
      `;
			return pathLarge;
		}

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

		return path;
	}, [
		segmentProgress,
		mySelectionProgress,
		cx,
		cy,
		radius,
		startAngle,
		sweepAngle,
		cornerRadius,
		animationStart,
		animationEnd,
		staticStrokeWidth,
		baseStrokeWidth,
		selectedStrokeWidth,
		isSelectionSegment,
		selectionExpandMode,
		isClosedLoop,
	]);

	return <Path path={pathString} color={color} style="fill" />;
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

import React, { useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path, Line } from 'react-native-svg';
import Animated, {
	useSharedValue,
	useAnimatedProps,
	withTiming,
	Easing,
	SharedValue,
	interpolateColor,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type {
	GroupedStackedBarChartProps,
	CornerRadius,
	ChartPressOutsideEvent,
	SelectionStyleConfig,
	ItemSelectionConfig,
} from '../../types';
import { useGlobalTouchEvents, type GlobalTouchPoint } from '../../context/GlobalTouchProvider';
import { validateGroupedStackedBarData } from '../../utils/validation';
import { TOUCH_CONFIG, TOUCH_CONFIG_SQUARED } from '../../utils/constants';
import { generateBarPath as generateBarPathUtil, parseCornerRadius } from '../../utils/pathGeneration';
import { useChartAnimation } from '../../utils/hooks';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface StackedBarProps {
	stack: {
		value: number;
		color: string;
		label?: string;
		cornerRadius?: CornerRadius;
		selectionConfig?: ItemSelectionConfig;
	}[];
	x: number;
	width: number;
	chartPaddingTop: number;
	chartHeight: number;
	yAxisMax: number;
	cornerRadius: CornerRadius;
	categoryIndex: number;
	selectedCategoryIndex?: number;
	selectedSegmentIndex?: number;
	selectedBarWidthScale: number;
	selectedBarHeightScale: number;
	selectionAnimationDuration: number;
	animationDuration: number;
	stackGap: number;
	enableRecolor: boolean;
	enableBorder: boolean;
	selectionBorderWidth: number;
	selectionBorderColor: string;
	selectionBorderAnimate: boolean;
	selectionColor?: string;
	applyToWholeStack: boolean;
}

const StackedBar: React.FC<StackedBarProps> = ({
	stack,
	x,
	width,
	chartPaddingTop,
	chartHeight,
	yAxisMax,
	cornerRadius,
	categoryIndex,
	selectedCategoryIndex,
	selectedSegmentIndex,
	selectedBarWidthScale,
	selectedBarHeightScale,
	selectionAnimationDuration,
	animationDuration,
	stackGap,
	enableRecolor,
	enableBorder,
	selectionBorderWidth,
	selectionBorderColor,
	selectionBorderAnimate,
	selectionColor,
	applyToWholeStack,
}) => {
	const stackProgress = useChartAnimation(animationDuration, categoryIndex * 50);
	const selectionProgress = useSharedValue(0);

	const totalStackValue = stack.reduce((sum, s) => sum + s.value, 0);
	const totalStackHeight = (totalStackValue / yAxisMax) * chartHeight;
	const totalGaps = (stack.length - 1) * stackGap;

	const availableHeightForSegments = Math.max(0, totalStackHeight - totalGaps);
	const segmentScale = totalStackHeight > 0 ? availableHeightForSegments / totalStackHeight : 0;

	const isStackSelected = selectedCategoryIndex === categoryIndex;
	const isWholeStackMode = applyToWholeStack && isStackSelected;

	useEffect(() => {
		selectionProgress.value = withTiming(isWholeStackMode ? 1 : 0, {
			duration: selectionAnimationDuration,
			easing: Easing.bezier(0.25, 0.1, 0.25, 1),
		});
	}, [isWholeStackMode, selectionAnimationDuration]);

	const stackStartY = chartPaddingTop + chartHeight - totalStackHeight;

	return (
		<>
			{stack.map((segment, segmentIndex) => {
				const baseSegmentHeight = (segment.value / yAxisMax) * chartHeight;
				const segmentHeight = baseSegmentHeight * segmentScale;

				const previousSegmentsHeight = stack
					.slice(0, segmentIndex)
					.reduce((sum, s) => sum + (s.value / yAxisMax) * chartHeight * segmentScale, 0);

				const segmentsBelowHeight = stack
					.slice(segmentIndex + 1)
					.reduce((sum, s) => sum + (s.value / yAxisMax) * chartHeight * segmentScale, 0);
				const yOffsetFromBelow = applyToWholeStack
					? segmentsBelowHeight * (selectedBarHeightScale - 1)
					: 0;

				const previousGaps = segmentIndex * stackGap;
				const segmentY =
					chartPaddingTop +
					chartHeight -
					totalStackHeight +
					previousSegmentsHeight +
					previousGaps;

				const isSegmentSelected =
					selectedCategoryIndex === categoryIndex &&
					(selectedSegmentIndex === undefined ||
						selectedSegmentIndex === segmentIndex);

				const isSelected = !applyToWholeStack && isSegmentSelected;
				const segmentsAfterHeight = stack
					.slice(segmentIndex + 1)
					.reduce((sum, s) => sum + (s.value / yAxisMax) * chartHeight * segmentScale, 0);
				const gapsAfter = (stack.length - 1 - segmentIndex) * stackGap;

				const segmentStartRatio =
					totalStackHeight === 0
						? 0
						: (segmentsAfterHeight + gapsAfter) / totalStackHeight;
				const segmentEndRatio =
					totalStackHeight === 0
						? 0
						: (segmentsAfterHeight + gapsAfter + segmentHeight) / totalStackHeight;

				let segmentCornerRadius: CornerRadius;
				if (segment.cornerRadius !== undefined) {
					segmentCornerRadius = segment.cornerRadius;
				} else if (typeof cornerRadius === 'number') {
					const isBottomSegment = segmentIndex === 0;
					const isTopSegment = segmentIndex === stack.length - 1;

					if (isTopSegment && isBottomSegment) {
						segmentCornerRadius = cornerRadius;
					} else if (isTopSegment) {
						segmentCornerRadius = { top: 0, bottom: cornerRadius };
					} else if (isBottomSegment) {
						segmentCornerRadius = { top: cornerRadius, bottom: 0 };
					} else {
						segmentCornerRadius = 0;
					}
				} else {
					segmentCornerRadius = cornerRadius;
				}

				const itemSelectionConfig = segment.selectionConfig;
				const itemSelectedColor = itemSelectionConfig?.selectedColor ?? selectionColor;
				const itemBorderWidth =
					itemSelectionConfig?.selectedBorder?.width ?? selectionBorderWidth;
				const itemBorderColor =
					itemSelectionConfig?.selectedBorder?.color ?? selectionBorderColor;
				const itemBorderAnimate =
					itemSelectionConfig?.selectedBorder?.animate ?? selectionBorderAnimate;

				let segmentColor = segment.color;
				return (
					<AnimatedBar
						key={`${categoryIndex}-${segmentIndex}`}
						x={x}
						y={segmentY}
						width={width}
						height={segmentHeight}
						color={segmentColor}
						selectedColor={itemSelectedColor}
						animateColor={enableRecolor && isSegmentSelected}
						cornerRadius={segmentCornerRadius}
						delay={0}
						animationDuration={0}
						isSelected={isSelected}
						selectedBarWidthScale={selectedBarWidthScale}
						selectedBarHeightScale={selectedBarHeightScale}
						selectionAnimationDuration={selectionAnimationDuration}
						isStackedSegment={true}
						stackProgress={stackProgress}
						segmentStartRatio={segmentStartRatio}
						segmentEndRatio={segmentEndRatio}
						showBorder={enableBorder && !applyToWholeStack}
						borderWidth={itemBorderWidth}
						borderColor={itemBorderColor}
						animateBorder={itemBorderAnimate}
						yOffsetFromBelow={yOffsetFromBelow}
						sharedSelectionProgress={applyToWholeStack ? selectionProgress : undefined}
					/>
				);
			})}
			{enableBorder && applyToWholeStack && (
				<WholeStackBorder
					x={x}
					y={stackStartY}
					width={width}
					height={totalStackHeight}
					borderWidth={selectionBorderWidth}
					borderColor={selectionBorderColor}
					selectionProgress={selectionProgress}
					animateBorder={selectionBorderAnimate}
					cornerRadius={cornerRadius}
					widthScale={selectedBarWidthScale}
					heightScale={selectedBarHeightScale}
					gapsHeight={totalGaps}
				/>
			)}
		</>
	);
};

const WholeStackBorder: React.FC<{
	x: number;
	y: number;
	width: number;
	height: number;
	borderWidth: number;
	borderColor: string;
	selectionProgress: SharedValue<number>;
	animateBorder: boolean;
	cornerRadius: CornerRadius;
	widthScale: number;
	heightScale: number;
	gapsHeight: number;
}> = ({
	x,
	y,
	width,
	height,
	borderWidth,
	borderColor,
	selectionProgress,
	animateBorder,
	cornerRadius,
	widthScale,
	heightScale,
	gapsHeight,
}) => {
	const animatedProps = useAnimatedProps(() => {
		const widthScaleValue = 1 + (widthScale - 1) * selectionProgress.value;
		const heightScaleValue = 1 + (heightScale - 1) * selectionProgress.value;

		const scaledWidth = width * widthScaleValue;
		const segmentsHeight = height - gapsHeight;
		const scaledSegmentsHeight = segmentsHeight * heightScaleValue;
		const scaledHeight = scaledSegmentsHeight + gapsHeight;
		const scaledX = x - (scaledWidth - width) / 2;
		const scaledY = y - (scaledHeight - height);

		const inset = borderWidth / 2;
		const insetX = scaledX + inset;
		const insetY = scaledY + inset;
		const insetWidth = Math.max(0, scaledWidth - borderWidth);
		const insetHeight = Math.max(0, scaledHeight - borderWidth);

		const radii = parseCornerRadius(cornerRadius, scaledWidth, scaledHeight);

		const insetMaxRadius = Math.min(insetWidth / 2, insetHeight / 2);
		const insetTopLeftRadius = Math.max(0, Math.min(radii.topLeft - inset, insetMaxRadius));
		const insetTopRightRadius = Math.max(0, Math.min(radii.topRight - inset, insetMaxRadius));
		const insetBottomLeftRadius = Math.max(
			0,
			Math.min(radii.bottomLeft - inset, insetMaxRadius)
		);
		const insetBottomRightRadius = Math.max(
			0,
			Math.min(radii.bottomRight - inset, insetMaxRadius)
		);

		const path = `
            M ${insetX + insetTopLeftRadius} ${insetY}
            L ${insetX + insetWidth - insetTopRightRadius} ${insetY}
            ${insetTopRightRadius > 0 ? `Q ${insetX + insetWidth} ${insetY} ${insetX + insetWidth} ${insetY + insetTopRightRadius}` : ''}
            L ${insetX + insetWidth} ${insetY + insetHeight - insetBottomRightRadius}
            ${insetBottomRightRadius > 0 ? `Q ${insetX + insetWidth} ${insetY + insetHeight} ${insetX + insetWidth - insetBottomRightRadius} ${insetY + insetHeight}` : ''}
            L ${insetX + insetBottomLeftRadius} ${insetY + insetHeight}
            ${insetBottomLeftRadius > 0 ? `Q ${insetX} ${insetY + insetHeight} ${insetX} ${insetY + insetHeight - insetBottomLeftRadius}` : ''}
            L ${insetX} ${insetY + insetTopLeftRadius}
            ${insetTopLeftRadius > 0 ? `Q ${insetX} ${insetY} ${insetX + insetTopLeftRadius} ${insetY}` : ''}
            Z
        `;

		const opacity = animateBorder
			? selectionProgress.value
			: selectionProgress.value > 0.5
				? 1
				: 0;
		return {
			d: path,
			opacity,
			stroke: borderColor,
			strokeWidth: borderWidth,
			fill: 'none',
		} as any;
	});

	return <AnimatedPath animatedProps={animatedProps} />;
};

export const GroupedStackedBarChart: React.FC<GroupedStackedBarChartProps> = ({
	data,
	width = 320,
	height = 180,
	cornerRadius = 6,
	groupGap = 16,
	barGap = 4,
	stackGap = 0,
	showValues = true,
	animationDuration = 1000,
	maxValue: maxValueProp,
	xAxis,
	yAxis,
	onBarPress,
	selectedCategoryIndex,
	selectedBarIndex,
	selectedSegmentIndex,
	selectionStyle,
	onPressOutside,
	deselectOnPressOutside = false,
	chartGestureRef,
}) => {
	validateGroupedStackedBarData(data);
	const selectionColor = selectionStyle?.color;
	const scaleConfig = selectionStyle?.scale;
	const selectionScaleWidth = typeof scaleConfig === 'number' ? scaleConfig : scaleConfig?.width;
	const selectionScaleHeight =
		typeof scaleConfig === 'number' ? scaleConfig : scaleConfig?.height;

	const selectionBorderWidth = selectionStyle?.border?.width ?? 2;
	const selectionBorderColor = selectionStyle?.border?.color ?? '#000000';
	const selectionBorderAnimate = selectionStyle?.border?.animate ?? true;
	const selectionDuration = selectionStyle?.animationDuration ?? 200;
	const applyToWholeStack = selectionStyle?.applyToWholeStack ?? false;

	const enableScale = !!(selectionScaleWidth || selectionScaleHeight);
	const enableRecolor = !!selectionColor;
	const enableBorder = !!selectionStyle?.border;

	const selectedWidthScale = enableScale ? (selectionScaleWidth ?? 1) : 1;
	const selectedHeightScale = enableScale ? (selectionScaleHeight ?? 1) : 1;
	const showYAxis = yAxis?.show !== false;
	const yAxisTicks = yAxis?.ticks?.count || 4;
	const showYAxisLabels = yAxis?.labels?.show !== false;
	const yAxisLabelFormatter = yAxis?.labels?.formatter;
	const yAxisLabelColor = yAxis?.labels?.color || '#C7C7CC';
	const yAxisLabelFontSize = yAxis?.labels?.fontSize || 11;
	const yAxisLabelFontWeight = yAxis?.labels?.fontWeight || '400';
	const yAxisLabelStyle = yAxis?.labels?.style;
	const showYAxisGrid = yAxis?.grid?.show !== false;
	const yAxisGridColor = yAxis?.grid?.color || '#E5E7EB';
	const yAxisGridWidth = yAxis?.grid?.width || 1;
	const yAxisGridOpacity = 0.3;

	const showXAxis = xAxis?.show !== false;
	const showXAxisLabels = xAxis?.labels?.show !== false;
	const xAxisLabelFormatter = xAxis?.labels?.formatter;
	const xAxisLabelColor = xAxis?.labels?.color || '#8E8E93';
	const xAxisLabelFontSize = xAxis?.labels?.fontSize || 12;
	const xAxisLabelFontWeight = xAxis?.labels?.fontWeight || '500';
	const xAxisLabelStyle = xAxis?.labels?.style;

	const isGrouped = data.length > 0 && 'bars' in data[0];
	let calculatedMaxValue = 0;
	if (isGrouped) {
		calculatedMaxValue = Math.max(
			0,
			...data.flatMap(item => ('bars' in item ? item.bars.map(b => b.value) : []))
		);
	} else {
		calculatedMaxValue = Math.max(
			0,
			...data.map(item =>
				'stack' in item ? item.stack.reduce((sum, s) => sum + s.value, 0) : 0
			)
		);
	}

	const maxValue = maxValueProp || calculatedMaxValue;
	const getYAxisMax = (max: number) => {
		if (max === 0) return 10;

		const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
		const normalized = max / magnitude;
		const niceNumbers = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

		let niceNumber = 10;
		for (const num of niceNumbers) {
			if (num >= normalized) {
				niceNumber = num;
				break;
			}
		}

		return niceNumber * magnitude;
	};

	const yAxisMax = showYAxis ? getYAxisMax(maxValue) : maxValue;

	const yAxisWidth = showYAxis ? 35 : 0;
	const chartPadding = { top: showValues ? 35 : 15, bottom: 35, left: yAxisWidth, right: 0 };
	const chartWidth = width - chartPadding.left - chartPadding.right;
	const chartHeight = height - chartPadding.top - chartPadding.bottom;

	const categoryCount = data.length;
	const totalCategoryGaps = (categoryCount - 1) * groupGap;
	const availableWidthForCategories = chartWidth - totalCategoryGaps;
	const categoryWidth = availableWidthForCategories / categoryCount;

	let barWidth: number;
	let barsPerCategory: number;

	if (isGrouped) {
		barsPerCategory = data[0] && 'bars' in data[0] ? data[0].bars.length : 1;
		const totalBarGaps = (barsPerCategory - 1) * barGap;
		barWidth = (categoryWidth - totalBarGaps) / barsPerCategory;
	} else {
		barsPerCategory = 1;
		barWidth = categoryWidth;
	}

	const yAxisValues = Array.from({ length: yAxisTicks + 1 }, (_, i) => {
		return (yAxisMax / yAxisTicks) * (yAxisTicks - i);
	});

	const getBarIndexForPoint = useCallback(
		(
			x: number,
			y: number
		): { categoryIndex: number; barIndex?: number; segmentIndex?: number } | null => {
			if (!data.length) {
				return null;
			}

			if (y < chartPadding.top || y > chartPadding.top + chartHeight) {
				return null;
			}

			for (let categoryIndex = 0; categoryIndex < data.length; categoryIndex++) {
				const categoryX = chartPadding.left + categoryIndex * (categoryWidth + groupGap);
				const item = data[categoryIndex];

				if (isGrouped && 'bars' in item) {
					const bars = item.bars;
					for (let barIndex = 0; barIndex < bars.length; barIndex++) {
						const barX = categoryX + barIndex * (barWidth + barGap);
						const barHeight = (bars[barIndex].value / yAxisMax) * chartHeight;
						const barY = chartPadding.top + chartHeight - barHeight;

						const isSelected =
							selectedCategoryIndex === categoryIndex &&
							selectedBarIndex === barIndex;
						const widthScale = isSelected ? selectedWidthScale : 1;
						const heightScale = isSelected ? selectedHeightScale : 1;

						const scaledWidth = barWidth * widthScale;
						const scaledHeight = barHeight * heightScale;
						const scaledBarX = barX - (scaledWidth - barWidth) / 2;
						const scaledBarY = barY - (scaledHeight - barHeight) / 2;

						if (
							x >= scaledBarX &&
							x <= scaledBarX + scaledWidth &&
							y >= scaledBarY &&
							y <= scaledBarY + scaledHeight
						) {
							return { categoryIndex, barIndex };
						}
					}
				} else if ('stack' in item) {
					const isStackSelected = selectedCategoryIndex === categoryIndex;
					const widthScale = isStackSelected ? selectedWidthScale : 1;

					const scaledBarWidth = barWidth * widthScale;
					const scaledCategoryX = categoryX - (scaledBarWidth - barWidth) / 2;

					if (x >= scaledCategoryX && x <= scaledCategoryX + scaledBarWidth) {
						const totalStackValue = item.stack.reduce((sum, s) => sum + s.value, 0);
						const totalStackHeight = (totalStackValue / yAxisMax) * chartHeight;
						const totalGaps = (item.stack.length - 1) * stackGap;
						const availableHeightForSegments = Math.max(
							0,
							totalStackHeight - totalGaps
						);
						const segmentScale =
							totalStackHeight > 0
								? availableHeightForSegments / totalStackHeight
								: 0;
						const stackStartY = chartPadding.top + chartHeight - totalStackHeight;

						let cumulativeHeight = 0;
						for (
							let segmentIndex = 0;
							segmentIndex < item.stack.length;
							segmentIndex++
						) {
							const segment = item.stack[segmentIndex];
							const baseSegmentHeight = (segment.value / yAxisMax) * chartHeight;
							const segmentHeight = baseSegmentHeight * segmentScale;
							const segmentY = stackStartY + cumulativeHeight;

							const isSegmentSelected =
								isStackSelected && selectedSegmentIndex === segmentIndex;
							const heightScale = isSegmentSelected ? selectedHeightScale : 1;

							const scaledSegmentHeight = segmentHeight * heightScale;
							const scaledSegmentY =
								segmentY - (scaledSegmentHeight - segmentHeight) / 2;

							if (y >= scaledSegmentY && y <= scaledSegmentY + scaledSegmentHeight) {
								return { categoryIndex, segmentIndex };
							}

							cumulativeHeight += segmentHeight + stackGap;
						}
						return { categoryIndex };
					}
				}
			}

			return null;
		},
		[
			data,
			chartPadding.left,
			chartPadding.top,
			chartHeight,
			barWidth,
			barGap,
			categoryWidth,
			groupGap,
			isGrouped,
			yAxisMax,
			stackGap,
			selectedCategoryIndex,
			selectedBarIndex,
			selectedSegmentIndex,
			selectedWidthScale,
			selectedHeightScale,
		]
	);

	const handleBarTap = useCallback(
		(x: number, y: number) => {
			const result = getBarIndexForPoint(x, y);
			if (result && onBarPress) {
				onBarPress(result.categoryIndex, result.barIndex ?? result.segmentIndex);
			}
		},
		[getBarIndexForPoint, onBarPress]
	);

	const tapStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
	const containerRef = useRef<View | null>(null);
	const chartBoundsRef = useRef<{ x: number; y: number; width: number; height: number } | null>(
		null
	);
	const selectedCategoryRef = useRef(selectedCategoryIndex);
	const selectedBarRef = useRef(selectedBarIndex);
	const selectedSegmentRef = useRef(selectedSegmentIndex);
	const onPressOutsideRef = useRef(onPressOutside);
	const autoDeselectRef = useRef(deselectOnPressOutside);
	const globalTouchEvents = useGlobalTouchEvents();

	type BasePressOutsideEvent = Omit<
		ChartPressOutsideEvent,
		'preventDefault' | 'defaultPrevented'
	>;

	const measureChartBounds = useCallback(() => {
		const view = containerRef.current;
		if (!view) {
			return;
		}

		view.measureInWindow((x, y, width, height) => {
			chartBoundsRef.current = { x, y, width, height };
		});
	}, []);

	const isPointInsideBounds = useCallback((x: number, y: number) => {
		const bounds = chartBoundsRef.current;
		if (!bounds) return false;
		return (
			x >= bounds.x &&
			x <= bounds.x + bounds.width &&
			y >= bounds.y &&
			y <= bounds.y + bounds.height
		);
	}, []);

	useEffect(() => {
		selectedCategoryRef.current = selectedCategoryIndex;
	}, [selectedCategoryIndex]);

	useEffect(() => {
		selectedBarRef.current = selectedBarIndex;
	}, [selectedBarIndex]);

	useEffect(() => {
		selectedSegmentRef.current = selectedSegmentIndex;
	}, [selectedSegmentIndex]);

	useEffect(() => {
		onPressOutsideRef.current = onPressOutside;
	}, [onPressOutside]);

	useEffect(() => {
		autoDeselectRef.current = deselectOnPressOutside;
	}, [deselectOnPressOutside]);

	useEffect(() => {
		const timeout = setTimeout(() => {
			measureChartBounds();
		}, 0);
		return () => clearTimeout(timeout);
	}, [measureChartBounds]);

	useEffect(() => {
		measureChartBounds();
	}, [width, height, measureChartBounds]);

	useEffect(() => {
		if (!globalTouchEvents) {
			return;
		}

		const unsubscribe = globalTouchEvents.subscribe(event => {
			if (
				selectedCategoryRef.current === undefined ||
				(!onPressOutsideRef.current && !autoDeselectRef.current)
			) {
				return;
			}

			const bounds = chartBoundsRef.current;
			if (!bounds) return;

			event.touches.forEach(touch => {
				if (event.type === 'up') {
					const inside = isPointInsideBounds(touch.absoluteX, touch.absoluteY);

					if (!inside) {
						const eventData: BasePressOutsideEvent = {
							absoluteX: touch.absoluteX,
							absoluteY: touch.absoluteY,
							localX: touch.absoluteX - bounds.x,
							localY: touch.absoluteY - bounds.y,
							startedInside: false,
							trigger: 'release',
							touchId: touch.id,
							timestamp: event.timestamp,
						};

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

						if (
							!enrichedEvent.defaultPrevented &&
							autoDeselectRef.current &&
							onBarPress
						) {
							onBarPress(-1, undefined);
						}
					}
				}
			});
		});

		return () => {
			unsubscribe();
		};
	}, [globalTouchEvents, onBarPress, isPointInsideBounds]);

	let tapGesture = Gesture.Tap()
		.enabled(!!onBarPress && data.length > 0)
		.maxDistance(TOUCH_CONFIG.TAP_MAX_DISTANCE)
		.maxDuration(TOUCH_CONFIG.TAP_MAX_DURATION)
		.onBegin(event => {
			tapStartRef.current = { x: event.x, y: event.y, time: Date.now() };
		})
		.onEnd(event => {
			'worklet';
			if (!onBarPress) {
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

			scheduleOnRN(handleBarTap, event.x, event.y);
		})
		.onFinalize(() => {
			tapStartRef.current = null;
		});

	if (chartGestureRef) {
		tapGesture = tapGesture.withRef(chartGestureRef as React.RefObject<any>);
	}

	return (
		<View
			ref={containerRef}
			style={[styles.container, { width, height: height + chartPadding.top }]}
		>
			<GestureDetector gesture={tapGesture}>
				<Svg width={width} height={height + chartPadding.top}>
					{showYAxis &&
						showYAxisGrid &&
						yAxisValues.map((value, index) => {
							const y = chartPadding.top + (index / yAxisTicks) * chartHeight;
							return (
								<React.Fragment key={`grid-${index}`}>
									<Line
										x1={chartPadding.left}
										y1={y}
										x2={width - chartPadding.right}
										y2={y}
										stroke={yAxisGridColor}
										strokeWidth={yAxisGridWidth}
										opacity={yAxisGridOpacity}
										strokeDasharray={yAxis?.grid?.dashArray?.join(' ')}
									/>
								</React.Fragment>
							);
						})}

					{data.map((item, categoryIndex) => {
						const categoryX =
							chartPadding.left + categoryIndex * (categoryWidth + groupGap);

						if (isGrouped && 'bars' in item) {
							return item.bars.map((bar, barIndex) => {
								const x = categoryX + barIndex * (barWidth + barGap);

								if ('stack' in bar && bar.stack) {
									return (
										<StackedBar
											key={`stack-${categoryIndex}-${barIndex}`}
											stack={bar.stack}
											x={x}
											width={barWidth}
											chartPaddingTop={chartPadding.top}
											chartHeight={chartHeight}
											yAxisMax={yAxisMax}
											cornerRadius={cornerRadius}
											categoryIndex={categoryIndex}
											selectedCategoryIndex={selectedCategoryIndex}
											selectedSegmentIndex={selectedSegmentIndex}
											selectedBarWidthScale={selectedWidthScale}
											selectedBarHeightScale={selectedHeightScale}
											selectionAnimationDuration={selectionDuration}
											animationDuration={animationDuration}
											stackGap={stackGap}
											enableRecolor={enableRecolor}
											enableBorder={enableBorder}
											selectionBorderWidth={selectionBorderWidth}
											selectionBorderColor={selectionBorderColor}
											selectionBorderAnimate={selectionBorderAnimate}
											selectionColor={selectionColor}
											applyToWholeStack={applyToWholeStack}
										/>
									);
								}

								const barHeight = (bar.value / yAxisMax) * chartHeight;
								const y = chartPadding.top + chartHeight - barHeight;
								const globalBarIndex = categoryIndex * barsPerCategory + barIndex;
								const isSelected =
									selectedCategoryIndex === categoryIndex &&
									selectedBarIndex === barIndex;

								const itemSelectionConfig = bar.selectionConfig;
								const itemSelectedColor =
									itemSelectionConfig?.selectedColor ?? selectionColor;
								const itemBorderWidth =
									itemSelectionConfig?.selectedBorder?.width ??
									selectionBorderWidth;
								const itemBorderColor =
									itemSelectionConfig?.selectedBorder?.color ??
									selectionBorderColor;
								const itemBorderAnimate =
									itemSelectionConfig?.selectedBorder?.animate ??
									selectionBorderAnimate;

								let barBaseColor = bar.color;

								return (
									<React.Fragment key={`${categoryIndex}-${barIndex}`}>
										<AnimatedBar
											x={x}
											y={y}
											width={barWidth}
											height={barHeight}
											color={barBaseColor}
											selectedColor={itemSelectedColor}
											animateColor={enableRecolor}
											cornerRadius={cornerRadius}
											delay={globalBarIndex * 50}
											animationDuration={animationDuration}
											isSelected={isSelected}
											selectedBarWidthScale={selectedWidthScale}
											selectedBarHeightScale={selectedHeightScale}
											selectionAnimationDuration={selectionDuration}
											showBorder={enableBorder}
											borderWidth={itemBorderWidth}
											borderColor={itemBorderColor}
											animateBorder={itemBorderAnimate}
										/>
									</React.Fragment>
								);
							});
						} else if ('stack' in item) {
							return (
								<StackedBar
									key={`stack-${categoryIndex}`}
									stack={item.stack}
									x={categoryX}
									width={barWidth}
									chartPaddingTop={chartPadding.top}
									chartHeight={chartHeight}
									yAxisMax={yAxisMax}
									cornerRadius={cornerRadius}
									categoryIndex={categoryIndex}
									selectedCategoryIndex={selectedCategoryIndex}
									selectedSegmentIndex={selectedSegmentIndex}
									selectedBarWidthScale={selectedWidthScale}
									selectedBarHeightScale={selectedHeightScale}
									selectionAnimationDuration={selectionDuration}
									animationDuration={animationDuration}
									stackGap={stackGap}
									enableRecolor={enableRecolor}
									enableBorder={enableBorder}
									selectionBorderWidth={selectionBorderWidth}
									selectionBorderColor={selectionBorderColor}
									selectionBorderAnimate={selectionBorderAnimate}
									selectionColor={selectionColor}
									applyToWholeStack={applyToWholeStack}
								/>
							);
						}

						return null;
					})}
				</Svg>
			</GestureDetector>

			{showYAxis && showYAxisLabels && (
				<View
					style={[
						styles.yAxisLabels,
						{ left: 0, top: chartPadding.top, width: yAxisWidth, height: chartHeight },
					]}
				>
					{yAxisValues.map((value, index) => {
						const y = (index / yAxisTicks) * chartHeight;
						const formattedValue = yAxisLabelFormatter
							? yAxisLabelFormatter(value, index)
							: value.toString();
						return (
							<View
								key={`label-${index}`}
								style={[styles.yAxisLabel, { top: y - 11 }]}
							>
								<Text
									style={[
										styles.yAxisLabelText,
										{
											color: yAxisLabelColor,
											fontSize: yAxisLabelFontSize,
											fontWeight: yAxisLabelFontWeight,
										},
										yAxisLabelStyle,
									]}
								>
									{formattedValue}
								</Text>
							</View>
						);
					})}
				</View>
			)}

			{showXAxis && showXAxisLabels && (
				<View
					style={[styles.xAxisLabels, { top: chartPadding.top + chartHeight + 8, width }]}
				>
					{data.map((item, index) => {
						const x = chartPadding.left + index * (categoryWidth + groupGap);
						const formattedLabel = xAxisLabelFormatter
							? xAxisLabelFormatter(item.category, index)
							: item.category;
						return (
							<View
								key={index}
								style={[styles.xAxisLabel, { left: x, width: categoryWidth }]}
							>
								<Text
									style={[
										styles.xAxisLabelText,
										{
											color: xAxisLabelColor,
											fontSize: xAxisLabelFontSize,
											fontWeight: xAxisLabelFontWeight,
										},
										xAxisLabelStyle,
									]}
								>
									{formattedLabel}
								</Text>
							</View>
						);
					})}
				</View>
			)}
		</View>
	);
};

interface AnimatedBarProps {
	x: number;
	y: number;
	width: number;
	height: number;
	color: string;
	selectedColor?: string;
	animateColor?: boolean;
	cornerRadius: CornerRadius;
	delay: number;
	animationDuration: number;
	isSelected?: boolean;
	selectedBarWidthScale?: number;
	selectedBarHeightScale?: number;
	selectionAnimationDuration?: number;
	isStackedSegment?: boolean;
	stackProgress?: SharedValue<number>;
	segmentStartRatio?: number;
	segmentEndRatio?: number;
	showBorder?: boolean;
	borderWidth?: number;
	borderColor?: string;
	animateBorder?: boolean;
	yOffsetFromBelow?: number;
	sharedSelectionProgress?: SharedValue<number>;
}

const AnimatedBar: React.FC<AnimatedBarProps> = ({
	x,
	y,
	width,
	height,
	color,
	selectedColor,
	animateColor = false,
	cornerRadius: cornerRadiusProp,
	delay,
	animationDuration,
	isSelected = false,
	selectedBarWidthScale = 1.1,
	selectedBarHeightScale = 1.1,
	selectionAnimationDuration = 200,
	isStackedSegment = false,
	stackProgress,
	segmentStartRatio = 0,
	segmentEndRatio = 1,
	showBorder = false,
	borderWidth = 2,
	borderColor = '#000000',
	animateBorder = true,
	yOffsetFromBelow = 0,
	sharedSelectionProgress,
}) => {
	const ownProgress = useSharedValue(0);
	const localSelectionProgress = useSharedValue(isSelected ? 1 : 0);
	const selectionProgress = sharedSelectionProgress ?? localSelectionProgress;

	useEffect(() => {
		if (!isStackedSegment || !stackProgress) {
			setTimeout(() => {
				ownProgress.value = withTiming(1, {
					duration: animationDuration,
					easing: Easing.bezier(0.25, 0.1, 0.25, 1),
				});
			}, delay);
		}
	}, [animationDuration, delay, isStackedSegment, stackProgress]);

	useEffect(() => {
		if (!sharedSelectionProgress) {
			localSelectionProgress.value = withTiming(isSelected ? 1 : 0, {
				duration: selectionAnimationDuration,
				easing: Easing.bezier(0.25, 0.1, 0.25, 1),
			});
		}
	}, [isSelected, selectionAnimationDuration, sharedSelectionProgress]);

	const animatedProps = useAnimatedProps(() => {
		'worklet';

		let segmentProgress = ownProgress.value;
		if (isStackedSegment && stackProgress) {
			const overallProgress = stackProgress.value;
			if (overallProgress <= segmentStartRatio) {
				segmentProgress = 0;
			} else if (overallProgress >= segmentEndRatio) {
				segmentProgress = 1;
			} else {
				const range = segmentEndRatio - segmentStartRatio;
				segmentProgress = range > 0 ? (overallProgress - segmentStartRatio) / range : 0;
			}
		}

		const currentHeight = height * segmentProgress;
		const animatedYOffset = yOffsetFromBelow * selectionProgress.value;
		const currentY = y + (height - currentHeight) - animatedYOffset;

		if (currentHeight <= 0.01) {
			return { d: '' };
		}

		const widthScale = 1 + (selectedBarWidthScale - 1) * selectionProgress.value;
		const heightScale = 1 + (selectedBarHeightScale - 1) * selectionProgress.value;
		const scaledWidth = width * widthScale;
		const scaledHeight = currentHeight * heightScale;

		const widthOffset = (scaledWidth - width) / 2;
		const heightOffset = scaledHeight - currentHeight;

		const scaledX = x - widthOffset;
		const scaledY = currentY - heightOffset;

		const radii = parseCornerRadius(cornerRadiusProp, scaledWidth, scaledHeight);

		const path = generateBarPathUtil(
			scaledX,
			scaledY,
			scaledWidth,
			scaledHeight,
			radii.topLeft,
			radii.topRight,
			radii.bottomLeft,
			radii.bottomRight
		);

		const fillColor =
			animateColor && selectedColor
				? interpolateColor(selectionProgress.value, [0, 1], [color, selectedColor])
				: color;

		return { d: path, fill: fillColor } as any;
	});

	const borderAnimatedProps = useAnimatedProps(() => {
		'worklet';

		let segmentProgress = ownProgress.value;
		if (isStackedSegment && stackProgress) {
			const overallProgress = stackProgress.value;
			if (overallProgress <= segmentStartRatio) {
				segmentProgress = 0;
			} else if (overallProgress >= segmentEndRatio) {
				segmentProgress = 1;
			} else {
				const range = segmentEndRatio - segmentStartRatio;
				segmentProgress = range > 0 ? (overallProgress - segmentStartRatio) / range : 0;
			}
		}

		const currentHeight = height * segmentProgress;
		const animatedYOffset = yOffsetFromBelow * selectionProgress.value;
		const currentY = y + (height - currentHeight) - animatedYOffset;

		if (currentHeight <= 0.01 || !showBorder) {
			return { d: '', strokeWidth: 0, opacity: 0 };
		}

		const widthScale = 1 + (selectedBarWidthScale - 1) * selectionProgress.value;
		const heightScale = 1 + (selectedBarHeightScale - 1) * selectionProgress.value;
		const scaledWidth = width * widthScale;
		const scaledHeight = currentHeight * heightScale;

		const widthOffset = (scaledWidth - width) / 2;
		const heightOffset = scaledHeight - currentHeight;

		const scaledX = x - widthOffset;
		const scaledY = currentY - heightOffset;

		const radii = parseCornerRadius(cornerRadiusProp, scaledWidth, scaledHeight);

		const inset = borderWidth / 2;
		const insetX = scaledX + inset;
		const insetY = scaledY + inset;
		const insetWidth = Math.max(0, scaledWidth - borderWidth);
		const insetHeight = Math.max(0, scaledHeight - borderWidth);

		const insetMaxRadius = Math.min(insetWidth / 2, insetHeight / 2);
		const insetTopLeftRadius = Math.max(0, Math.min(radii.topLeft - inset, insetMaxRadius));
		const insetTopRightRadius = Math.max(0, Math.min(radii.topRight - inset, insetMaxRadius));
		const insetBottomLeftRadius = Math.max(
			0,
			Math.min(radii.bottomLeft - inset, insetMaxRadius)
		);
		const insetBottomRightRadius = Math.max(
			0,
			Math.min(radii.bottomRight - inset, insetMaxRadius)
		);

		const path = generateBarPathUtil(
			insetX,
			insetY,
			insetWidth,
			insetHeight,
			insetTopLeftRadius,
			insetTopRightRadius,
			insetBottomLeftRadius,
			insetBottomRightRadius
		);

		const borderOpacity = animateBorder ? selectionProgress.value : isSelected ? 1 : 0;
		return {
			d: path,
			strokeWidth: borderWidth,
			opacity: borderOpacity,
		};
	});

	return (
		<>
			<AnimatedPath animatedProps={animatedProps} />
			{showBorder && (
				<AnimatedPath
					stroke={borderColor}
					fill="none"
					animatedProps={borderAnimatedProps}
				/>
			)}
		</>
	);
};

const styles = StyleSheet.create({
	container: {
		position: 'relative',
	},
	yAxisLabels: {
		position: 'absolute',
	},
	yAxisLabel: {
		position: 'absolute',
		alignItems: 'flex-start',
		justifyContent: 'flex-start',
		width: '100%',
		paddingLeft: 0,
	},
	yAxisLabelText: {
		fontSize: 11,
		lineHeight: 11,
		color: '#C7C7CC',
	},
	xAxisLabels: {
		position: 'absolute',
		flexDirection: 'row',
	},
	xAxisLabel: {
		position: 'absolute',
		alignItems: 'center',
		justifyContent: 'center',
	},
	xAxisLabelText: {
		fontSize: 12,
		fontWeight: '500',
		color: '#8E8E93',
	},
});

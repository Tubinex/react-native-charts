import React, { useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, type GestureResponderEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path, Line } from 'react-native-svg';
import Animated, {
	useSharedValue,
	useAnimatedProps,
	withTiming,
	Easing,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { GroupedStackedBarChartProps, CornerRadius } from '../../types';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export const GroupedStackedBarChart: React.FC<GroupedStackedBarChartProps> = ({
	data,
	width = 320,
	height = 180,
	cornerRadius = 6,
	groupGap = 16,
	barGap = 4,
	showValues = true,
	valueFormatter,
	animationDuration = 1000,
	maxValue: maxValueProp,
	xAxis,
	yAxis,
	onBarPress,
	selectedBar,
	selectedBarColor,
	selectedBarScale = 1.1,
	selectionAnimationDuration = 200,
	onPressOutside,
	chartGestureRef,
}) => {
	const showYAxis = yAxis?.show !== false;
	const yAxisTicks = yAxis?.ticks?.count || 4;
	const showYAxisLabels = yAxis?.labels?.show !== false;
	const yAxisLabelFormatter = yAxis?.labels?.formatter;
	const yAxisLabelColor = yAxis?.labels?.color || '#C7C7CC';
	const yAxisLabelFontSize = yAxis?.labels?.fontSize || 11;
	const yAxisLabelFontWeight = yAxis?.labels?.fontWeight || '400';
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

	const isGrouped = data.length > 0 && 'bars' in data[0];
	let calculatedMaxValue = 0;
	if (isGrouped) {
		calculatedMaxValue = Math.max(
			...data.flatMap(item => ('bars' in item ? item.bars.map(b => b.value) : []))
		);
	} else {
		calculatedMaxValue = Math.max(
			...data.map(item =>
				'stack' in item ? item.stack.reduce((sum, s) => sum + s.value, 0) : 0
			)
		);
	}

	const maxValue = maxValueProp || calculatedMaxValue;
	const getYAxisMax = (max: number) => {
		const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
		return Math.ceil(max / magnitude) * magnitude;
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
		(x: number, y: number) => {
			if (!data.length) {
				return -1;
			}

			if (y < chartPadding.top || y > chartPadding.top + chartHeight) {
				return -1;
			}

			for (let categoryIndex = 0; categoryIndex < data.length; categoryIndex++) {
				const categoryX = chartPadding.left + categoryIndex * (categoryWidth + groupGap);
				const item = data[categoryIndex];

				if (isGrouped && 'bars' in item) {
					const bars = item.bars;
					for (let barIndex = 0; barIndex < bars.length; barIndex++) {
						const barX = categoryX + barIndex * (barWidth + barGap);
						if (x >= barX && x <= barX + barWidth) {
							return categoryIndex * barsPerCategory + barIndex;
						}
					}
				} else {
					if (x >= categoryX && x <= categoryX + barWidth) {
						return categoryIndex;
					}
				}
			}

			return -1;
		},
		[data.length, chartPadding.left, chartPadding.top, chartHeight, barWidth, barGap, categoryWidth, groupGap, isGrouped, barsPerCategory]
	);

	const handleBarTap = useCallback(
		(x: number, y: number) => {
			const index = getBarIndexForPoint(x, y);
			if (index !== -1 && onBarPress) {
				onBarPress(index);
			}
		},
		[getBarIndexForPoint, onBarPress]
	);

	const tapStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
	const deselectTouchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

	let tapGesture = Gesture.Tap()
		.enabled(!!onBarPress && data.length > 0)
		.maxDistance(18)
		.maxDuration(280)
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

				if (distSquared > 18 * 18) {
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
		tapGesture = tapGesture.withRef(chartGestureRef);
	}

	const handleTouchStart = useCallback(
		(event: GestureResponderEvent) => {
			if (!onPressOutside || !selectedBar) {
				return;
			}
			const { locationX, locationY } = event.nativeEvent;
			deselectTouchStartRef.current = { x: locationX, y: locationY, time: Date.now() };
		},
		[onPressOutside, selectedBar]
	);

	const handleTouchEnd = useCallback(
		(event: GestureResponderEvent) => {
			if (!onPressOutside || !selectedBar) {
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
				const index = getBarIndexForPoint(locationX, locationY);
				if (index === -1) {
					setTimeout(() => {
						onPressOutside();
					}, 10);
				}
			}
		},
		[onPressOutside, selectedBar, getBarIndexForPoint]
	);

	const deselectTouchEnabled = !!onPressOutside && !!selectedBar;

	return (
		<View
			style={[styles.container, { width, height: height + chartPadding.top }]}
			onTouchStart={deselectTouchEnabled ? handleTouchStart : undefined}
			onTouchEnd={deselectTouchEnabled ? handleTouchEnd : undefined}
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
						const categoryX = chartPadding.left + categoryIndex * (categoryWidth + groupGap);

						if (isGrouped && 'bars' in item) {
							return item.bars.map((bar, barIndex) => {
								const barHeight = (bar.value / yAxisMax) * chartHeight;
								const x = categoryX + barIndex * (barWidth + barGap);
								const y = chartPadding.top + chartHeight - barHeight;
								const globalBarIndex = categoryIndex * barsPerCategory + barIndex;
								const isSelected =
									selectedBar?.categoryIndex === categoryIndex &&
									selectedBar?.barIndex === barIndex;

								return (
									<React.Fragment key={`${categoryIndex}-${barIndex}`}>
										<AnimatedBar
											x={x}
											y={y}
											width={barWidth}
											height={barHeight}
											color={isSelected && selectedBarColor ? selectedBarColor : bar.color}
											cornerRadius={cornerRadius}
											delay={globalBarIndex * 50}
											animationDuration={animationDuration}
											isSelected={isSelected}
											selectedBarScale={selectedBarScale}
											selectionAnimationDuration={selectionAnimationDuration}
										/>
									</React.Fragment>
								);
							});
						} else if ('stack' in item) {
							let currentY = chartPadding.top + chartHeight;
							return item.stack.map((segment, segmentIndex) => {
								const segmentHeight = (segment.value / yAxisMax) * chartHeight;
								currentY -= segmentHeight;
								const isSelected = selectedBar?.categoryIndex === categoryIndex;

								return (
									<React.Fragment key={`${categoryIndex}-${segmentIndex}`}>
										<AnimatedBar
											x={categoryX}
											y={currentY}
											width={barWidth}
											height={segmentHeight}
											color={isSelected && selectedBarColor ? selectedBarColor : segment.color}
											cornerRadius={cornerRadius}
											delay={categoryIndex * 50 + segmentIndex * 20}
											animationDuration={animationDuration}
											isSelected={isSelected}
											selectedBarScale={selectedBarScale}
											selectionAnimationDuration={selectionAnimationDuration}
										/>
									</React.Fragment>
								);
							});
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
				<View style={[styles.xAxisLabels, { top: chartPadding.top + chartHeight + 8, width }]}>
					{data.map((item, index) => {
						const x = chartPadding.left + index * (categoryWidth + groupGap);
						const formattedLabel = xAxisLabelFormatter
							? xAxisLabelFormatter(item.category, index)
							: item.category;
						return (
							<View key={index} style={[styles.xAxisLabel, { left: x, width: categoryWidth }]}>
								<Text
									style={[
										styles.xAxisLabelText,
										{
											color: xAxisLabelColor,
											fontSize: xAxisLabelFontSize,
											fontWeight: xAxisLabelFontWeight,
										},
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
	cornerRadius: CornerRadius;
	delay: number;
	animationDuration: number;
	isSelected?: boolean;
	selectedBarScale?: number;
	selectionAnimationDuration?: number;
}

const AnimatedBar: React.FC<AnimatedBarProps> = ({
	x,
	y,
	width,
	height,
	color,
	cornerRadius: cornerRadiusProp,
	delay,
	animationDuration,
	isSelected = false,
	selectedBarScale = 1.1,
	selectionAnimationDuration = 200,
}) => {
	const barProgress = useSharedValue(0);
	const selectionProgress = useSharedValue(isSelected ? 1 : 0);

	useEffect(() => {
		setTimeout(() => {
			barProgress.value = withTiming(1, {
				duration: animationDuration,
				easing: Easing.bezier(0.25, 0.1, 0.25, 1),
			});
		}, delay);
	}, [animationDuration, delay]);

	useEffect(() => {
		selectionProgress.value = withTiming(isSelected ? 1 : 0, {
			duration: selectionAnimationDuration,
			easing: Easing.out(Easing.ease),
		});
	}, [isSelected, selectionAnimationDuration]);

	const animatedProps = useAnimatedProps(() => {
		'worklet';

		const currentHeight = height * barProgress.value;
		const currentY = y + (height - currentHeight);

		if (currentHeight <= 0.01) {
			return { d: '' };
		}

		const scale = 1 + (selectedBarScale - 1) * selectionProgress.value;
		const scaledWidth = width * scale;
		const scaledHeight = currentHeight * scale;

		const widthOffset = (scaledWidth - width) / 2;
		const heightOffset = scaledHeight - currentHeight;

		const scaledX = x - widthOffset;
		const scaledY = currentY - heightOffset;

		let topLeftRadius = 0;
		let topRightRadius = 0;
		let bottomLeftRadius = 0;
		let bottomRightRadius = 0;

		if (typeof cornerRadiusProp === 'number') {
			topLeftRadius = topRightRadius = cornerRadiusProp;
			bottomLeftRadius = bottomRightRadius = 0;
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
		return { d: path };
	});

	return <AnimatedPath fill={color} animatedProps={animatedProps} />;
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

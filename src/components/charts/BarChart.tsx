import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Path, Line, Rect } from 'react-native-svg';
import Animated, {
	useSharedValue,
	useAnimatedProps,
	withTiming,
	Easing,
	SharedValue,
} from 'react-native-reanimated';
import type { BarChartProps } from '../../types';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export const BarChart: React.FC<BarChartProps> = ({
	data,
	width = 320,
	height = 180,
	barColor,
	cornerRadius = 6,
	barGap = 8,
	showValues = true,
	valueFormatter,
	animationDuration = 1000,
	maxValue: maxValueProp,
	showYAxis = true,
	yAxisTicks = 4,
	onBarPress,
	selectedBarIndex = -1,
	selectedBarColor,
}) => {
	const defaultBarColor = barColor || '#7ED957';
	const defaultSelectedBarColor = selectedBarColor || '#5FB832';

	const maxValue = maxValueProp || Math.max(...data.map(d => d.value));

	const getYAxisMax = (max: number) => {
		const magnitude = Math.pow(10, Math.floor(Math.log10(max)));
		return Math.ceil(max / magnitude) * magnitude;
	};

	const yAxisMax = showYAxis ? getYAxisMax(maxValue) : maxValue;

	const yAxisWidth = showYAxis ? 35 : 0;
	const chartPadding = { top: showValues ? 35 : 15, bottom: 35, left: yAxisWidth, right: 0 };
	const chartWidth = width - chartPadding.left - chartPadding.right;
	const chartHeight = height - chartPadding.top - chartPadding.bottom;

	const totalGaps = (data.length - 1) * barGap;
	const barWidth = (chartWidth - totalGaps) / data.length;

	const yAxisValues = Array.from({ length: yAxisTicks + 1 }, (_, i) => {
		return (yAxisMax / yAxisTicks) * (yAxisTicks - i);
	});

	const formatValue = (value: number) => {
		if (valueFormatter) {
			return valueFormatter(value);
		}
		return value.toString();
	};

	return (
		<View style={[styles.container, { width, height: height + chartPadding.top }]}>
			<Svg width={width} height={height + chartPadding.top}>
				{showYAxis &&
					yAxisValues.map((value, index) => {
						const y = chartPadding.top + (index / yAxisTicks) * chartHeight;
						return (
							<React.Fragment key={`grid-${index}`}>
								<Line
									x1={chartPadding.left}
									y1={y}
									x2={width - chartPadding.right}
									y2={y}
									stroke="#E5E7EB"
									strokeWidth={1}
									opacity={0.3}
								/>
							</React.Fragment>
						);
					})}

				{data.map((item, index) => {
					const barHeight = (item.value / yAxisMax) * chartHeight;
					const x = chartPadding.left + index * (barWidth + barGap);
					const y = chartPadding.top + chartHeight - barHeight;
					const isSelected = index === selectedBarIndex;
					const color =
						item.color || (isSelected ? defaultSelectedBarColor : defaultBarColor);

					return (
						<React.Fragment key={index}>
							{onBarPress && (
								<Rect
									x={x}
									y={chartPadding.top}
									width={barWidth}
									height={chartHeight}
									fill="transparent"
									onPress={() => onBarPress(index)}
								/>
							)}
							<AnimatedBar
								x={x}
								y={y}
								width={barWidth}
								height={barHeight}
								color={color}
								cornerRadius={cornerRadius}
								delay={index * 50}
								animationDuration={animationDuration}
							/>
						</React.Fragment>
					);
				})}
			</Svg>

			{showYAxis && (
				<View
					style={[
						styles.yAxisLabels,
						{ left: 0, top: chartPadding.top, width: yAxisWidth, height: chartHeight },
					]}
				>
					{yAxisValues.map((value, index) => {
						const y = (index / yAxisTicks) * chartHeight;
						return (
							<View
								key={`label-${index}`}
								style={[styles.yAxisLabel, { top: y - 11 }]}
							>
								<Text style={styles.yAxisLabelText}>{value}</Text>
							</View>
						);
					})}
				</View>
			)}

			{showValues && (
				<View style={[styles.labelsContainer, { top: 0, width, height: chartPadding.top }]}>
					{data.map((item, index) => {
						const barHeight = (item.value / yAxisMax) * chartHeight;
						const x = chartPadding.left + index * (barWidth + barGap);
						const shouldShowLabel =
							item.showValue !== false && barHeight > chartHeight * 0.2;

						return shouldShowLabel ? (
							<Animated.View
								key={index}
								style={[
									styles.valueLabel,
									{
										left: x,
										width: barWidth,
										top: chartPadding.top + chartHeight - barHeight - 22,
									},
								]}
							>
								<Text style={styles.valueLabelText}>{formatValue(item.value)}</Text>
							</Animated.View>
						) : null;
					})}
				</View>
			)}

			<View style={[styles.xAxisLabels, { top: chartPadding.top + chartHeight + 8, width }]}>
				{data.map((item, index) => {
					const x = chartPadding.left + index * (barWidth + barGap);
					return (
						<View key={index} style={[styles.xAxisLabel, { left: x, width: barWidth }]}>
							<Text style={styles.xAxisLabelText}>{item.label}</Text>
						</View>
					);
				})}
			</View>
		</View>
	);
};

interface AnimatedBarProps {
	x: number;
	y: number;
	width: number;
	height: number;
	color: string;
	cornerRadius: number;
	delay: number;
	animationDuration: number;
}

const AnimatedBar: React.FC<AnimatedBarProps> = ({
	x,
	y,
	width,
	height,
	color,
	cornerRadius,
	delay,
	animationDuration,
}) => {
	const barProgress = useSharedValue(0);

	useEffect(() => {
		setTimeout(() => {
			barProgress.value = withTiming(1, {
				duration: animationDuration,
				easing: Easing.bezier(0.25, 0.1, 0.25, 1),
			});
		}, delay);
	}, [animationDuration, delay]);

	const animatedProps = useAnimatedProps(() => {
		'worklet';

		const currentHeight = height * barProgress.value;
		const currentY = y + (height - currentHeight);

		if (currentHeight <= 0.01) {
			return { d: '' };
		}

		const maxCornerRadius = Math.min(cornerRadius, width / 2, currentHeight);

		const path = `
      M ${x},${currentY + maxCornerRadius}
      Q ${x},${currentY} ${x + maxCornerRadius},${currentY}
      L ${x + width - maxCornerRadius},${currentY}
      Q ${x + width},${currentY} ${x + width},${currentY + maxCornerRadius}
      L ${x + width},${currentY + currentHeight}
      L ${x},${currentY + currentHeight}
      Z
    `;

		return { d: path };
	});

	return <AnimatedPath fill={color} animatedProps={animatedProps} />;
};

const styles = StyleSheet.create({
	container: {
		position: 'relative',
	},
	labelsContainer: {
		position: 'absolute',
	},
	valueLabel: {
		position: 'absolute',
		alignItems: 'center',
		justifyContent: 'center',
	},
	valueLabelText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#1C1C1E',
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

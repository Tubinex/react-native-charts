import type { StyleProp, TextStyle, ViewStyle } from 'react-native';

export type ContentAlignment = 'center' | 'flex-start' | 'flex-end';

export interface ChartSegment {
	value: number;
	color: string;
	label?: string;
}

export type RadialSegment = ChartSegment;
export type DonutChartSegment = ChartSegment;
export type SemiCircleChartSegment = ChartSegment;
export type GaugeSegment = ChartSegment;

export interface BarData {
	value: number;
	label: string;
	color?: string;
	showValue?: boolean;
	selectionConfig?: ItemSelectionConfig;
}

export type CornerRadiusTopBottom = {
	top: number;
	bottom: number;
};

export type CornerRadiusFull = {
	topLeft: number;
	topRight: number;
	bottomLeft: number;
	bottomRight: number;
};

export type CornerRadius = number | CornerRadiusTopBottom | CornerRadiusFull;

export interface AxisConfig {
	show?: boolean;
	color?: string;
	width?: number;
	ticks?: {
		show?: boolean;
		count?: number;
		values?: (string | number)[];
		color?: string;
		width?: number;
		length?: number;
	};
	labels?: {
		show?: boolean;
		formatter?: (value: number | string, index: number) => string;
		color?: string;
		fontSize?: number;
		fontWeight?:
			| 'normal'
			| 'bold'
			| '100'
			| '200'
			| '300'
			| '400'
			| '500'
			| '600'
			| '700'
			| '800'
			| '900';
		rotation?: number;
		style?: StyleProp<TextStyle>;
	};
	grid?: {
		show?: boolean;
		color?: string;
		width?: number;
		dashArray?: number[];
	};
}

export interface GroupedBarData {
	category: string;
	bars: {
		value: number;
		color: string;
		label?: string;
		selectionConfig?: ItemSelectionConfig;
		stack?: {
			value: number;
			color: string;
			label?: string;
			cornerRadius?: CornerRadius;
			selectionConfig?: ItemSelectionConfig;
		}[];
	}[];
}

export interface StackedBarData {
	category: string;
	stack: {
		value: number;
		color: string;
		label?: string;
		cornerRadius?: CornerRadius;
		selectionConfig?: ItemSelectionConfig;
	}[];
}

export type SelectionExpandMode = 'scale' | 'expand';
export type DeselectTrigger = 'move' | 'release';
export interface SelectionBorderConfig {
	width?: number;
	color?: string;
	animate?: boolean;
}

export type SelectionScaleConfig = number | { width?: number; height?: number };

export interface SelectionStyleConfig {
	color?: string;
	scale?: SelectionScaleConfig;
	border?: SelectionBorderConfig;
	applyToWholeStack?: boolean;
	animationDuration?: number;
}

export interface ItemSelectionConfig {
	selectedColor?: string;
	selectedScale?: SelectionScaleConfig;
	selectedBorder?: SelectionBorderConfig;
}

export interface ChartPressOutsideEvent {
	absoluteX: number;
	absoluteY: number;
	localX: number;
	localY: number;
	startedInside: boolean;
	trigger: DeselectTrigger;
	touchId: number;
	timestamp: number;
	defaultPrevented: boolean;
	preventDefault: () => void;
}

export interface ValueLabelRenderContext {
	value: number;
	index: number;
	formattedValue: string;
	isSelected: boolean;
}

export interface ValueLabelConfig {
	formatter?: (value: number, index: number) => string;
	offset?: number;
	minBarHeightRatio?: number;
	containerStyle?: StyleProp<ViewStyle>;
	textStyle?: StyleProp<TextStyle>;
	render?: (context: ValueLabelRenderContext) => React.ReactNode;
}

export interface RadialChartProps {
	segments: RadialSegment[];
	maxValue?: number;
	size?: number;
	strokeWidth?: number;
	cornerRadius?: number;
	segmentGap?: number;
	backgroundColor?: string;
	animationDuration?: number;
	startAngle?: number;
	sweepAngle?: number;
	viewBoxHeightRatio?: number;
	centerContent?: React.ReactNode;
	contentAlignment?: ContentAlignment;
	onSegmentPress?: (index: number) => void;
	selectedSegmentIndex?: number;
	selectedStrokeWidthIncrease?: number;
	selectionAnimationDuration?: number;
	selectionExpandMode?: SelectionExpandMode;
	onPressOutside?: (event: ChartPressOutsideEvent) => void;
	deselectOnPressOutside?: boolean;
	chartGestureRef?: React.RefObject<any>;
}

export interface DonutChartProps {
	segments: DonutChartSegment[];
	size?: number;
	strokeWidth?: number;
	cornerRadius?: number;
	segmentGap?: number;
	backgroundColor?: string;
	animationDuration?: number;
	centerContent?: React.ReactNode;
	onSegmentPress?: (index: number) => void;
	selectedSegmentIndex?: number;
	selectedStrokeWidthIncrease?: number;
	selectionAnimationDuration?: number;
	onPressOutside?: (event: ChartPressOutsideEvent) => void;
	deselectOnPressOutside?: boolean;
	chartGestureRef?: React.RefObject<any>;
}

export interface SemiCircleChartProps {
	segments: SemiCircleChartSegment[];
	maxValue?: number;
	size?: number;
	strokeWidth?: number;
	cornerRadius?: number;
	segmentGap?: number;
	backgroundColor?: string;
	animationDuration?: number;
	centerContent?: React.ReactNode;
	contentAlignment?: ContentAlignment;
	onSegmentPress?: (index: number) => void;
	selectedSegmentIndex?: number;
	selectedStrokeWidthIncrease?: number;
	selectionAnimationDuration?: number;
	onPressOutside?: (event: ChartPressOutsideEvent) => void;
	deselectOnPressOutside?: boolean;
	chartGestureRef?: React.RefObject<any>;
}

export interface RadialGaugeProps {
	progress: number;
	size?: number;
	strokeWidth?: number;
	cornerRadius?: number;
	backgroundColor?: string;
	animationDuration?: number;
	color?: string;
	startAngle?: number;
	sweepAngle?: number;
	viewBoxHeightRatio?: number;
	centerContent?: React.ReactNode;
	contentAlignment?: ContentAlignment;
}

export interface DonutGaugeProps {
	progress: number;
	size?: number;
	strokeWidth?: number;
	cornerRadius?: number;
	backgroundColor?: string;
	animationDuration?: number;
	color?: string;
	centerContent?: React.ReactNode;
}

export interface SemiCircleGaugeProps {
	progress: number;
	size?: number;
	strokeWidth?: number;
	cornerRadius?: number;
	backgroundColor?: string;
	animationDuration?: number;
	color?: string;
	centerContent?: React.ReactNode;
	contentAlignment?: ContentAlignment;
}

export interface GroupedStackedBarChartProps {
	data: (GroupedBarData | StackedBarData)[];
	width?: number;
	height?: number;
	barColor?: string;
	cornerRadius?: CornerRadius;
	barGap?: number;
	groupGap?: number;
	stackGap?: number;
	showValues?: boolean;
	valueFormatter?: (value: number) => string;
	animationDuration?: number;
	maxValue?: number;
	xAxis?: AxisConfig;
	yAxis?: AxisConfig;
	onBarPress?: (categoryIndex: number, barIndex?: number) => void;
	selectedCategoryIndex?: number;
	selectedBarIndex?: number;
	selectedSegmentIndex?: number;
	selectionStyle?: SelectionStyleConfig;
	onPressOutside?: (event: ChartPressOutsideEvent) => void;
	deselectOnPressOutside?: boolean;
	chartGestureRef?: React.RefObject<any>;
}

export interface BarChartProps {
	data: BarData[];
	width?: number;
	height?: number;
	barColor?: string;
	cornerRadius?: CornerRadius;
	barGap?: number;
	showValues?: boolean;
	valueFormatter?: (value: number) => string;
	animationDuration?: number;
	maxValue?: number;
	xAxis?: AxisConfig;
	yAxis?: AxisConfig;
	onBarPress?: (index: number) => void;
	selectedBarIndex?: number;
	selectionStyle?: SelectionStyleConfig;
	onPressOutside?: (event: ChartPressOutsideEvent) => void;
	deselectOnPressOutside?: boolean;
	chartGestureRef?: React.RefObject<any>;
}

export interface GroupedBarChartProps {
	data: GroupedBarData[];
	width?: number;
	height?: number;
	cornerRadius?: CornerRadius;
	barGap?: number;
	groupGap?: number;
	showValues?: boolean;
	valueFormatter?: (value: number) => string;
	animationDuration?: number;
	maxValue?: number;
	xAxis?: AxisConfig;
	yAxis?: AxisConfig;
	onBarPress?: (categoryIndex: number, barIndex: number) => void;
	selectedCategoryIndex?: number;
	selectedBarIndex?: number;
	selectionStyle?: SelectionStyleConfig;
	onPressOutside?: (event: ChartPressOutsideEvent) => void;
	deselectOnPressOutside?: boolean;
	chartGestureRef?: React.RefObject<any>;
}

export interface StackedBarChartProps {
	data: StackedBarData[];
	width?: number;
	height?: number;
	cornerRadius?: CornerRadius;
	groupGap?: number;
	stackGap?: number;
	showValues?: boolean;
	valueFormatter?: (value: number) => string;
	animationDuration?: number;
	maxValue?: number;
	xAxis?: AxisConfig;
	yAxis?: AxisConfig;
	onBarPress?: (categoryIndex: number, segmentIndex?: number) => void;
	selectedCategoryIndex?: number;
	selectedSegmentIndex?: number;
	selectionStyle?: SelectionStyleConfig;
	onPressOutside?: (event: ChartPressOutsideEvent) => void;
	deselectOnPressOutside?: boolean;
	chartGestureRef?: React.RefObject<any>;
}

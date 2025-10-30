export type ContentAlignment = 'center' | 'flex-start' | 'flex-end';

export interface RadialSegment {
	value: number;
	color: string;
	label?: string;
}

export interface ChartSegment {
	value: number;
	color: string;
	label?: string;
}

export interface DonutChartSegment extends ChartSegment {}

export interface SemiCircleChartSegment extends ChartSegment {}

export interface GaugeSegment {
	value: number;
	color: string;
	label?: string;
}

export interface BarData {
	value: number;
	label: string;
	color?: string;
	showValue?: boolean;
}

export interface RadialGraphProps {
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
	closedLoop?: boolean;
	contentAlignment?: ContentAlignment;
	onSegmentPress?: (index: number) => void;
	selectedSegmentIndex?: number;
	selectedStrokeWidthIncrease?: number;
	selectionAnimationDuration?: number;
	allowTapWhenNoSelection?: boolean;
	tapGestureMaxDist?: number;
	tapGestureMaxDurationMs?: number;
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
	allowTapWhenNoSelection?: boolean;
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
	allowTapWhenNoSelection?: boolean;
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

export interface BarChartProps {
	data: BarData[];
	width?: number;
	height?: number;
	barColor?: string;
	cornerRadius?: number;
	barGap?: number;
	showValues?: boolean;
	valueFormatter?: (value: number) => string;
	animationDuration?: number;
	maxValue?: number;
	showYAxis?: boolean;
	yAxisTicks?: number;
	onBarPress?: (index: number) => void;
	selectedBarIndex?: number;
	selectedBarColor?: string;
}

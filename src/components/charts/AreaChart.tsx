import React, { useMemo, useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import {
    Canvas,
    Path,
    Line,
    Circle,
    Group,
    rect
} from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
    useSharedValue,
    useAnimatedReaction,
    runOnJS,
} from 'react-native-reanimated';
import type { AreaChartProps, ChartPressOutsideEvent } from '../../types';
import { validateAreaLineData } from '../../utils/validation';
import { useChartAnimation } from '../../utils/hooks';
import {
    dataToScreen,
    findNearestPoint,
    interpolateYAtX,
    interpolateYAtXSmooth,
    type Padding,
    type ScreenPoint,
} from '../../utils/coordinateMapping';
import {
    generateLinePath,
    generateAreaPath,
    type CurveType,
} from '../../utils/linePathGeneration';
import { TOUCH_CONFIG } from '../../utils/constants';
import { useGlobalTouchEvents } from '../../context/GlobalTouchProvider';

export const AreaChart: React.FC<AreaChartProps> = ({
    data,
    width = 320,
    height = 200,
    fillColor = 'rgba(126, 217, 87, 0.25)',
    strokeColor = 'rgba(126, 217, 87, 1)',
    strokeWidth = 2,
    smooth = true,
    animationDuration = 1200,
    onPointPress,
    selectedPointIndex = -1,
    selectedPointRadius = 8,
    onPressOutside,
    deselectOnPressOutside = false,
    chartGestureRef,
    xAxis,
    yAxis,
    minX,
    maxX,
    minY,
    maxY,
    showPoints = false,
    pointRadius = 4,
    pointColor,
    explorer,
}) => {
    validateAreaLineData(data);

    const containerRef = useRef<View | null>(null);
    const chartBoundsRef = useRef<{ x: number; y: number; width: number; height: number } | null>(
        null
    );
    const tapStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
    const progress = useChartAnimation(animationDuration);

    const explorerIndex = useSharedValue(explorer?.initialIndex ?? -1);
    const explorerActive = useSharedValue(false);
    const [selectionVisible, setSelectionVisible] = useState(false);
    const [currentExplorerIndex, setCurrentExplorerIndex] = useState<number>(-1);
    const [currentExplorerX, setCurrentExplorerX] = useState<number>(-1);
    const [isExplorerActive, setIsExplorerActive] = useState(false);
    const [explorerProgressValue, setExplorerProgressValue] = useState(0);

    useAnimatedReaction(
        () => progress.value,
        (currentValue) => {
            runOnJS(setExplorerProgressValue)(currentValue);
        },
        [progress]
    );

    const yAxisWidth = yAxis?.show !== false ? 40 : 0;
    const xAxisHeight = xAxis?.show !== false ? 30 : 0;
    const padding: Padding = useMemo(
        () => ({
            top: 10,
            right: 10,
            bottom: xAxisHeight,
            left: yAxisWidth,
        }),
        [xAxisHeight, yAxisWidth]
    );

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const dataMinX = minX ?? (data.length > 0 ? Math.min(...data.map(p => p.x)) : 0);
    const dataMaxX = maxX ?? (data.length > 0 ? Math.max(...data.map(p => p.x)) : 1);
    const dataMinY = minY ?? (data.length > 0 ? Math.min(...data.map(p => p.y)) : 0);
    const dataMaxY = maxY ?? (data.length > 0 ? Math.max(...data.map(p => p.y)) : 1);

    const calculateNiceScale = (min: number, max: number, tickCount: number) => {
        const range = max - min;
        const roughInterval = range / (tickCount || 4);

        // Get the magnitude (power of 10)
        const magnitude = Math.pow(10, Math.floor(Math.log10(roughInterval)));
        const normalizedInterval = roughInterval / magnitude;

        // Choose a nice interval from common values
        let niceInterval: number;
        if (normalizedInterval <= 1) niceInterval = 1;
        else if (normalizedInterval <= 2) niceInterval = 2;
        else if (normalizedInterval <= 2.5) niceInterval = 2.5;
        else if (normalizedInterval <= 5) niceInterval = 5;
        else niceInterval = 10;

        niceInterval *= magnitude;

        // Calculate nice min and max
        const niceMin = Math.floor(min / niceInterval) * niceInterval;
        const niceMax = Math.ceil(max / niceInterval) * niceInterval;

        return { min: niceMin, max: niceMax, interval: niceInterval };
    };

    const tickCount = yAxis?.ticks?.count ?? 4;
    const yRange = dataMaxY - dataMinY;
    const yPadding = yRange * 0.1;
    const niceScale = calculateNiceScale(dataMinY - yPadding, dataMaxY + yPadding, tickCount);
    const adjustedMinY = niceScale.min;
    const adjustedMaxY = niceScale.max;

    const screenPoints = useMemo<ScreenPoint[]>(() => {
        return data.map((point, index) => {
            const screenPoint = dataToScreen(
                point,
                dataMinX,
                dataMaxX,
                adjustedMinY,
                adjustedMaxY,
                chartWidth,
                chartHeight,
                padding
            );
            return {
                ...screenPoint,
                dataIndex: index,
            };
        });
    }, [data, dataMinX, dataMaxX, adjustedMinY, adjustedMaxY, chartWidth, chartHeight, padding]);

    const baselineY = padding.top + chartHeight;
    const animatedScreenPoints = useMemo<ScreenPoint[]>(() => {
        if (!isExplorerActive) return screenPoints;
        return screenPoints.map(p => ({
            ...p,
            y: baselineY + (p.y - baselineY) * explorerProgressValue,
        }));
    }, [screenPoints, baselineY, explorerProgressValue, isExplorerActive]);

    const curveType: CurveType = smooth ? 'smooth' : 'linear';

    const lineColor = strokeColor || fillColor;
    const pointFillColor = pointColor || lineColor;

    const yAxisTicks = useMemo(() => {
        const tickCount = yAxis?.ticks?.count ?? 4;
        const ticks: number[] = [];

        for (let i = 0; i <= tickCount; i++) {
            const value = adjustedMinY + (adjustedMaxY - adjustedMinY) * (i / tickCount);
            ticks.push(value);
        }

        return ticks;
    }, [yAxis, adjustedMinY, adjustedMaxY]);

    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.measureInWindow((x, y, w, h) => {
                chartBoundsRef.current = { x, y, width: w, height: h };
            });
        }
    }, [width, height]);

    useEffect(() => {
        setSelectionVisible(selectedPointIndex >= 0);
    }, [selectedPointIndex]);

    useAnimatedReaction(
        () => explorerIndex.value,
        (currentIndex, previousIndex) => {
            if (
                currentIndex !== previousIndex &&
                currentIndex >= 0 &&
                explorer?.onMove &&
                explorerActive.value
            ) {
                runOnJS(explorer.onMove)(currentIndex, data[currentIndex]);
            }
        },
        [data, explorer]
    );

    const globalTouchEvents = useGlobalTouchEvents();

    useEffect(() => {
        if (!globalTouchEvents) return;

        const unsubscribe = globalTouchEvents.subscribe(event => {
            if (event.type === 'up' && selectedPointIndex >= 0) {
                const touch = event.touches[0];
                const bounds = chartBoundsRef.current;

                if (!bounds) return;

                const inside =
                    touch.absoluteX >= bounds.x &&
                    touch.absoluteX <= bounds.x + bounds.width &&
                    touch.absoluteY >= bounds.y &&
                    touch.absoluteY <= bounds.y + bounds.height;

                if (!inside) {
                    const enrichedEvent: ChartPressOutsideEvent = {
                        absoluteX: touch.absoluteX,
                        absoluteY: touch.absoluteY,
                        localX: touch.absoluteX - bounds.x,
                        localY: touch.absoluteY - bounds.y,
                        startedInside: false,
                        trigger: 'release',
                        touchId: touch.id,
                        timestamp: event.timestamp,
                        defaultPrevented: false,
                        preventDefault: function () {
                            enrichedEvent.defaultPrevented = true;
                        },
                    };

                    if (onPressOutside) {
                        onPressOutside(enrichedEvent);
                    }

                    if (!enrichedEvent.defaultPrevented && deselectOnPressOutside && onPointPress) {
                        onPointPress(-1);
                    }
                }
            }
        });

        return unsubscribe;
    }, [globalTouchEvents, selectedPointIndex, onPointPress, onPressOutside, deselectOnPressOutside]);

    const tapGesture = useMemo(() => {
        const handleTap = (x: number) => {
            if (!onPointPress) return;
            const nearestIndex = findNearestPoint(x, screenPoints);
            if (nearestIndex >= 0) {
                onPointPress(nearestIndex);
            }
        };

        let gesture = Gesture.Tap()
            .enabled(!!onPointPress && data.length > 0)
            .maxDistance(TOUCH_CONFIG.TAP_MAX_DISTANCE)
            .maxDuration(TOUCH_CONFIG.TAP_MAX_DURATION)
            .onBegin(event => {
                tapStartRef.current = { x: event.x, y: event.y, time: Date.now() };
            })
            .onEnd(event => {
                'worklet';
                runOnJS(handleTap)(event.x);
            });

        if (chartGestureRef) {
            gesture = gesture.withRef(chartGestureRef);
        }

        return gesture;
    }, [onPointPress, data.length, screenPoints, chartGestureRef]);

    const panGesture = useMemo(() => {
        const handleExplorerBegin = (x: number) => {
            const minX = screenPoints.length > 0 ? screenPoints[0].x : padding.left;
            const maxX = screenPoints.length > 0 ? screenPoints[screenPoints.length - 1].x : width - padding.right;
            const clampedX = Math.max(minX, Math.min(maxX, x));

            setIsExplorerActive(true);
            const nearestIndex = findNearestPoint(clampedX, screenPoints);
            setCurrentExplorerIndex(nearestIndex);
            setCurrentExplorerX(clampedX);
            if (explorer?.onMove && nearestIndex >= 0) {
                explorer.onMove(nearestIndex, data[nearestIndex]);
            }
        };

        const handleExplorerUpdate = (x: number) => {
            const minX = screenPoints.length > 0 ? screenPoints[0].x : padding.left;
            const maxX = screenPoints.length > 0 ? screenPoints[screenPoints.length - 1].x : width - padding.right;
            const clampedX = Math.max(minX, Math.min(maxX, x));

            const nearestIndex = findNearestPoint(clampedX, screenPoints);
            setCurrentExplorerIndex(nearestIndex);
            setCurrentExplorerX(clampedX);
            if (explorer?.onMove && nearestIndex >= 0) {
                explorer.onMove(nearestIndex, data[nearestIndex]);
            }
        };

        const handleExplorerEnd = () => {
            setIsExplorerActive(false);
            setCurrentExplorerIndex(-1);
            setCurrentExplorerX(-1);
        };

        return Gesture.Pan()
            .enabled(!!explorer?.enabled)
            .minDistance(5)
            .onBegin(event => {
                'worklet';
                explorerActive.value = true;
                runOnJS(handleExplorerBegin)(event.x);
            })
            .onUpdate(event => {
                'worklet';
                runOnJS(handleExplorerUpdate)(event.x);
            })
            .onEnd(() => {
                'worklet';
                explorerActive.value = false;
                runOnJS(handleExplorerEnd)();
            })
            .onFinalize(() => {
                'worklet';
                explorerActive.value = false;
                runOnJS(handleExplorerEnd)();
            });
    }, [explorer?.enabled, explorer?.onMove, explorer?.snapToPoint, screenPoints, data, explorerActive, padding.left, padding.right, width]);

    const composedGesture = Gesture.Simultaneous(tapGesture, panGesture);
    if (data.length === 0) {
        return (
            <View ref={containerRef} style={[styles.container, { width, height }]}>
                <Canvas style={{ width, height }} />
            </View>
        );
    }

    return (
        <View
            ref={containerRef}
            style={[styles.container, { width, height }]}
            onLayout={() => {
                if (containerRef.current) {
                    containerRef.current.measureInWindow((x, y, w, h) => {
                        chartBoundsRef.current = { x, y, width: w, height: h };
                    });
                }
            }}
        >
            <Canvas style={{ width, height }}>
                {yAxis?.grid?.show &&
                    yAxisTicks.map((value, index) => {
                        const y = padding.top + ((yAxisTicks.length - 1 - index) / (yAxisTicks.length - 1)) * chartHeight;
                        return (
                            <Line
                                key={`grid-${index}`}
                                p1={{ x: padding.left, y }}
                                p2={{ x: width - padding.right, y }}
                                color={yAxis?.grid?.color || '#E5E7EB'}
                                strokeWidth={yAxis?.grid?.width || 1}
                                opacity={0.3}
                            />
                        );
                    })}

                {fillColor !== 'transparent' && (
                    <AreaPathComponent
                        screenPoints={screenPoints}
                        curveType={curveType}
                        baselineY={baselineY}
                        fillColor={fillColor}
                        progress={progress}
                        explorerEnabled={explorer?.enabled ?? false}
                        explorerIndex={currentExplorerIndex}
                        explorerActive={isExplorerActive}
                        explorerX={currentExplorerX}
                        snapToPoint={explorer?.snapToPoint ?? true}
                        inactiveColor={explorer?.inactiveColor}
                    />
                )}

                <LinePathComponent
                    screenPoints={screenPoints}
                    curveType={curveType}
                    baselineY={baselineY}
                    strokeColor={lineColor}
                    strokeWidth={strokeWidth}
                    progress={progress}
                    explorerEnabled={explorer?.enabled ?? false}
                    explorerIndex={currentExplorerIndex}
                    explorerActive={isExplorerActive}
                    explorerX={currentExplorerX}
                    snapToPoint={explorer?.snapToPoint ?? true}
                    inactiveColor={explorer?.inactiveColor}
                />

                {showPoints && isExplorerActive && currentExplorerIndex >= 0 && (
                    <>
                        <Group clip={rect(0, 0, screenPoints[currentExplorerIndex]?.x || 0, 10000)}>
                            {animatedScreenPoints.map((point, index) => (
                                <Circle
                                    key={`point-active-${index}`}
                                    cx={point.x}
                                    cy={point.y}
                                    r={pointRadius}
                                    color={pointFillColor}
                                />
                            ))}
                        </Group>
                        <Group clip={rect(screenPoints[currentExplorerIndex]?.x || 0, 0, 10000, 10000)}>
                            {animatedScreenPoints.map((point, index) => (
                                <Circle
                                    key={`point-grayed-${index}`}
                                    cx={point.x}
                                    cy={point.y}
                                    r={pointRadius}
                                    color={explorer?.inactiveColor || pointFillColor}
                                    opacity={explorer?.inactiveColor ? 1 : 0.3}
                                />
                            ))}
                        </Group>
                    </>
                )}

                {showPoints && selectionVisible && selectedPointIndex >= 0 && selectedPointIndex < screenPoints.length && (
                    <Circle
                        cx={screenPoints[selectedPointIndex].x}
                        cy={screenPoints[selectedPointIndex].y}
                        r={selectedPointRadius}
                        color={pointFillColor}
                        opacity={0.8}
                    />
                )}

                {explorer?.enabled && isExplorerActive && currentExplorerIndex >= 0 && currentExplorerIndex < screenPoints.length && (
                    <>
                        {(explorer.showLine ?? true) && (
                            <Line
                                p1={{
                                    x: (explorer.snapToPoint ?? true)
                                        ? screenPoints[currentExplorerIndex].x
                                        : currentExplorerX,
                                    y: padding.top
                                }}
                                p2={{
                                    x: (explorer.snapToPoint ?? true)
                                        ? screenPoints[currentExplorerIndex].x
                                        : currentExplorerX,
                                    y: padding.top + chartHeight
                                }}
                                color={explorer.lineColor || lineColor}
                                strokeWidth={explorer.lineWidth || 2}
                                opacity={0.8}
                            />
                        )}
                        {(explorer.showDot ?? true) && (
                            <Circle
                                cx={
                                    (explorer.snapToPoint ?? true)
                                        ? screenPoints[currentExplorerIndex].x
                                        : currentExplorerX
                                }
                                cy={
                                    (explorer.snapToPoint ?? true)
                                        ? animatedScreenPoints[currentExplorerIndex].y
                                        : smooth
                                            ? interpolateYAtXSmooth(currentExplorerX, animatedScreenPoints)
                                            : interpolateYAtX(currentExplorerX, animatedScreenPoints)
                                }
                                r={explorer.dotRadius || 6}
                                color={explorer.dotColor || lineColor}
                            />
                        )}
                    </>
                )}
            </Canvas>
            <GestureDetector gesture={composedGesture}>
                <View
                    style={[StyleSheet.absoluteFill, { width, height }]}
                    pointerEvents="box-only"
                />
            </GestureDetector>
            {yAxis?.labels?.show !== false && yAxis?.show !== false && (
                <View
                    style={[
                        styles.yAxisLabels,
                        { left: 0, top: padding.top, width: yAxisWidth, height: chartHeight },
                    ]}
                    pointerEvents="none"
                >
                    {yAxisTicks.map((value, index) => {
                        const y =
                            ((yAxisTicks.length - 1 - index) / (yAxisTicks.length - 1)) * chartHeight - 11;
                        const formattedValue = yAxis?.labels?.formatter
                            ? yAxis.labels.formatter(value, index)
                            : value.toFixed(0);
                        return (
                            <View key={`ylabel-${index}`} style={[styles.yAxisLabel, { top: y }]}>
                                <Text
                                    style={[
                                        styles.yAxisLabelText,
                                        {
                                            color: yAxis?.labels?.color || '#6B7280',
                                            fontSize: yAxis?.labels?.fontSize || 10,
                                            fontWeight: yAxis?.labels?.fontWeight || '400',
                                        },
                                        yAxis?.labels?.style,
                                    ]}
                                >
                                    {formattedValue}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            )}
            {xAxis?.labels?.show !== false && xAxis?.show !== false && (() => {
                const labelWidth = 40;
                const maxLabels = Math.floor(chartWidth / labelWidth);
                const step = data.length <= maxLabels ? 1 : Math.ceil(data.length / maxLabels);

                const indicesToShow = new Set<number>();
                indicesToShow.add(0);
                indicesToShow.add(data.length - 1);
                for (let i = step; i < data.length - 1; i += step) {
                    indicesToShow.add(i);
                }

                return (
                    <View
                        style={[styles.xAxisLabels, { top: padding.top + chartHeight + 8, width }]}
                        pointerEvents="none"
                    >
                        {data.map((point, index) => {
                            if (!indicesToShow.has(index)) return null;

                            const x = screenPoints[index].x;
                            const formattedLabel = xAxis?.labels?.formatter
                                ? xAxis.labels.formatter(point.label || point.x, index)
                                : (point.label || point.x.toString());
                            return (
                                <View
                                    key={`xlabel-${index}`}
                                    style={[styles.xAxisLabel, { left: x - 20, width: 40 }]}
                                >
                                    <Text
                                        style={[
                                            styles.xAxisLabelText,
                                            {
                                                color: xAxis?.labels?.color || '#6B7280',
                                                fontSize: xAxis?.labels?.fontSize || 10,
                                                fontWeight: xAxis?.labels?.fontWeight || '400',
                                            },
                                            xAxis?.labels?.style,
                                        ]}
                                    >
                                        {formattedLabel}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                );
            })()}
        </View>
    );
};

const useDownsampledPoints = (screenPoints: ScreenPoint[], maxPoints: number = 150) => {
    return useMemo(() => {
        if (screenPoints.length <= maxPoints) {
            return screenPoints;
        }

        const step = Math.ceil(screenPoints.length / maxPoints);
        const downsampled: typeof screenPoints = [];
        for (let i = 0; i < screenPoints.length; i += step) {
            downsampled.push(screenPoints[i]);
        }
        if (downsampled[downsampled.length - 1] !== screenPoints[screenPoints.length - 1]) {
            downsampled.push(screenPoints[screenPoints.length - 1]);
        }
        return downsampled;
    }, [screenPoints, maxPoints]);
};

const useAnimatedPoints = (
    renderPoints: ScreenPoint[],
    baselineY: number,
    progress: ReturnType<typeof useChartAnimation>
) => {
    const [progressValue, setProgressValue] = useState(0);
    const lastUpdateTime = useRef(0);

    useAnimatedReaction(
        () => progress.value,
        (currentValue) => {
            const now = Date.now();
            if (now - lastUpdateTime.current > 16 || currentValue >= 0.99) {
                lastUpdateTime.current = now;
                runOnJS(setProgressValue)(currentValue);
            }
        },
        [progress]
    );

    return useMemo(() => {
        return renderPoints.map(p => ({
            ...p,
            y: baselineY + (p.y - baselineY) * progressValue,
        }));
    }, [renderPoints, baselineY, progressValue]);
};

const useExplorerClip = (
    explorerEnabled: boolean,
    explorerActive: boolean,
    explorerIndex: number,
    screenPoints: ScreenPoint[],
    snapToPoint: boolean,
    explorerX: number
) => {
    return useMemo(() => {
        if (explorerEnabled && explorerActive && explorerIndex >= 0 && explorerIndex < screenPoints.length) {
            return snapToPoint ? screenPoints[explorerIndex].x : explorerX;
        }
        return null;
    }, [explorerEnabled, explorerActive, explorerIndex, screenPoints, snapToPoint, explorerX]);
};

interface LinePathComponentProps {
    screenPoints: ScreenPoint[];
    curveType: CurveType;
    baselineY: number;
    strokeColor: string;
    strokeWidth: number;
    progress: ReturnType<typeof useChartAnimation>;
    explorerEnabled: boolean;
    explorerIndex: number;
    explorerActive: boolean;
    explorerX: number;
    snapToPoint: boolean;
    inactiveColor?: string;
}

const LinePathComponent: React.FC<LinePathComponentProps> = ({
    screenPoints,
    curveType,
    baselineY,
    strokeColor,
    strokeWidth,
    progress,
    explorerEnabled,
    explorerIndex,
    explorerActive,
    explorerX,
    snapToPoint,
    inactiveColor,
}) => {
    const renderPoints = useDownsampledPoints(screenPoints);
    const animatedPoints = useAnimatedPoints(renderPoints, baselineY, progress);
    const effectiveCurveType: CurveType = renderPoints.length > 100 ? 'linear' : curveType;

    const pathString = useMemo(() => {
        return generateLinePath(animatedPoints, effectiveCurveType);
    }, [animatedPoints, effectiveCurveType]);

    const explorerClipX = useExplorerClip(explorerEnabled, explorerActive, explorerIndex, screenPoints, snapToPoint, explorerX);
    if (explorerClipX !== null) {
        return (
            <>
                <Group clip={rect(0, 0, explorerClipX, 10000)}>
                    <Path
                        path={pathString}
                        color={strokeColor}
                        style="stroke"
                        strokeWidth={strokeWidth}
                    />
                </Group>
                <Group clip={rect(explorerClipX, 0, 10000, 10000)}>
                    <Path
                        path={pathString}
                        color={inactiveColor || strokeColor}
                        style="stroke"
                        strokeWidth={strokeWidth}
                        opacity={inactiveColor ? 1 : 0.3}
                    />
                </Group>
            </>
        );
    }

    return <Path path={pathString} color={strokeColor} style="stroke" strokeWidth={strokeWidth} />;
};

interface AreaPathComponentProps {
    screenPoints: ScreenPoint[];
    curveType: CurveType;
    baselineY: number;
    fillColor: string;
    progress: ReturnType<typeof useChartAnimation>;
    explorerEnabled: boolean;
    explorerIndex: number;
    explorerActive: boolean;
    explorerX: number;
    snapToPoint: boolean;
    inactiveColor?: string;
}

const AreaPathComponent: React.FC<AreaPathComponentProps> = ({
    screenPoints,
    curveType,
    baselineY,
    fillColor,
    progress,
    explorerEnabled,
    explorerIndex,
    explorerActive,
    explorerX,
    snapToPoint,
    inactiveColor,
}) => {
    const renderPoints = useDownsampledPoints(screenPoints);
    const animatedPoints = useAnimatedPoints(renderPoints, baselineY, progress);
    const effectiveCurveType: CurveType = renderPoints.length > 100 ? 'linear' : curveType;

    const pathString = useMemo(() => {
        return generateAreaPath(animatedPoints, effectiveCurveType, baselineY);
    }, [animatedPoints, effectiveCurveType, baselineY]);

    const explorerClipX = useExplorerClip(explorerEnabled, explorerActive, explorerIndex, screenPoints, snapToPoint, explorerX);

    if (explorerClipX !== null) {
        return (
            <>
                <Group clip={rect(0, 0, explorerClipX, 10000)}>
                    <Path path={pathString} color={fillColor} style="fill" />
                </Group>
                <Group clip={rect(explorerClipX, 0, 10000, 10000)}>
                    <Path path={pathString} color={inactiveColor || fillColor} style="fill" opacity={inactiveColor ? 1 : 0.3} />
                </Group>
            </>
        );
    }

    return <Path path={pathString} color={fillColor} style="fill" />;
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'transparent',
        position: 'relative',
    },
    yAxisLabels: {
        position: 'absolute',
        justifyContent: 'space-between',
    },
    yAxisLabel: {
        position: 'absolute',
        width: '100%',
        alignItems: 'flex-end',
        paddingRight: 4,
    },
    yAxisLabelText: {
        fontSize: 10,
    },
    xAxisLabels: {
        position: 'absolute',
        height: 30,
    },
    xAxisLabel: {
        position: 'absolute',
        alignItems: 'center',
    },
    xAxisLabelText: {
        fontSize: 10,
        textAlign: 'center',
    },
});


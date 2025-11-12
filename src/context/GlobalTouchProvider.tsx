import React, {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useRef,
	type ReactNode,
} from 'react';
import { View } from 'react-native';
import {
	Gesture,
	GestureDetector,
	type GestureTouchEvent,
	type TouchData,
} from 'react-native-gesture-handler';

type GlobalTouchType = 'down' | 'move' | 'up' | 'cancel';

export type GlobalTouchPoint = {
	id: number;
	x: number;
	y: number;
	absoluteX: number;
	absoluteY: number;
};

export type GlobalTouchEvent = {
	type: GlobalTouchType;
	touches: GlobalTouchPoint[];
	timestamp: number;
};

type GlobalTouchListener = (event: GlobalTouchEvent) => void;

type GlobalTouchContextValue = {
	subscribe: (listener: GlobalTouchListener) => () => void;
};

const GlobalTouchContext = createContext<GlobalTouchContextValue | null>(null);

const toPoints = (touches: TouchData[]): GlobalTouchPoint[] =>
	touches.map(touch => ({
		id: touch.id,
		x: touch.x,
		y: touch.y,
		absoluteX: touch.absoluteX,
		absoluteY: touch.absoluteY,
	}));

const TOUCH_EVENT_TYPE = {
	TOUCHES_DOWN: 1,
	TOUCHES_MOVE: 2,
	TOUCHES_UP: 3,
	TOUCHES_CANCELLED: 4,
} as const;

const mapEventType = (event: GestureTouchEvent): GlobalTouchType | null => {
	switch (event.eventType) {
		case TOUCH_EVENT_TYPE.TOUCHES_DOWN:
			return 'down';
		case TOUCH_EVENT_TYPE.TOUCHES_MOVE:
			return 'move';
		case TOUCH_EVENT_TYPE.TOUCHES_UP:
			return 'up';
		case TOUCH_EVENT_TYPE.TOUCHES_CANCELLED:
			return 'cancel';
		default:
			return null;
	}
};

export const GlobalTouchProvider = ({ children }: { children: ReactNode }) => {
	const listenersRef = useRef<Set<GlobalTouchListener>>(new Set());

	const notifyListeners = useCallback((event: GestureTouchEvent) => {
		const type = mapEventType(event);
		if (!type) {
			return;
		}

		const touches = toPoints(event.changedTouches);
		if (touches.length === 0) {
			return;
		}

		const payload: GlobalTouchEvent = {
			type,
			touches,
			timestamp: Date.now(),
		};

		listenersRef.current.forEach(listener => {
			listener(payload);
		});
	}, []);

	const gesture = useMemo(() => {
		return Gesture.Pan()
			.manualActivation(true)
			.runOnJS(true)
			.onTouchesDown(event => {
				notifyListeners(event);
			})
			.onTouchesMove(event => {
				notifyListeners(event);
			})
			.onTouchesUp(event => {
				notifyListeners(event);
			})
			.onTouchesCancelled(event => {
				notifyListeners(event);
			});
	}, [notifyListeners]);

	const contextValue = useMemo<GlobalTouchContextValue>(
		() => ({
			subscribe: (listener: GlobalTouchListener) => {
				listenersRef.current.add(listener);
				return () => {
					listenersRef.current.delete(listener);
				};
			},
		}),
		[]
	);

	return (
		<GlobalTouchContext.Provider value={contextValue}>
			<GestureDetector gesture={gesture}>
				<View style={{ flex: 1 }} pointerEvents="box-none">
					{children}
				</View>
			</GestureDetector>
		</GlobalTouchContext.Provider>
	);
};

export const useGlobalTouchEvents = () => {
	return useContext(GlobalTouchContext);
};

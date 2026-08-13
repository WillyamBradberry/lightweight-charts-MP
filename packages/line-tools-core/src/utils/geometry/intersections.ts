// /src/utils/geometry/intersections.ts

import { Coordinate } from 'lightweight-charts';
import { Point, Box, Line, Segment, equalPoints, lineSegment, lineThroughPoints } from './point';

/**
 * Internal helper to add a unique point to an array.
 * 
 * Checks if the `point` already exists in the `array` (using geometric equality).
 * If it does not exist, it pushes the point and returns `true`.
 * 
 * @param array - The target array of points.
 * @param point - The point to attempt to add.
 * @returns `true` if the point was added, `false` if it was a duplicate.
 */
function addPoint(array: Point[], point: Point): boolean {
	for (let i = 0; i < array.length; i++) {
		if (equalPoints(array[i], point)) {
			return false;
		}
	}

	array.push(point);
	return true;
}

/**
 * Calculates the intersection geometry between an infinite {@link Line} and an axis-aligned {@link Box}.
 *
 * @param line - The infinite line equation (`ax + by + c = 0`).
 * @param box - The bounding box.
 * @returns A {@link Segment} (if passing through), a single {@link Point} (if touching a corner/edge tangentially), or `null` (if no intersection).
 */
export function intersectLineAndBox(line: Line, box: Box): Segment | Point | null {
	if (line.a === 0) {
		const l = -line.c / line.b;
		return box.min.y <= l && l <= box.max.y ? lineSegment(new Point(box.min.x as Coordinate, l as Coordinate), new Point(box.max.x as Coordinate, l as Coordinate)) : null;
	}
	if (line.b === 0) {
		const h = -line.c / line.a;
		return box.min.x <= h && h <= box.max.x ? lineSegment(new Point(h as Coordinate, box.min.y as Coordinate), new Point(h as Coordinate, box.max.y as Coordinate)) : null;
	}

	const points: Point[] = [];
	const u = function(value: number): void {
		const i = -(line.c + line.a * value) / line.b;
		if (box.min.y <= i && i <= box.max.y) { addPoint(points, new Point(value as Coordinate, i as Coordinate)); }
	};
	const p = function(value: number): void {
		const s = -(line.c + line.b * value) / line.a;
		if (box.min.x <= s && s <= box.max.x) { addPoint(points, new Point(s as Coordinate, value as Coordinate)); }
	};

	u(box.min.x);
	p(box.min.y);
	u(box.max.x);
	p(box.max.y);

	switch (points.length) {
		case 0:
			return null;
		case 1:
			return points[0];
		case 2:
			return equalPoints(points[0], points[1]) ? points[0] : lineSegment(points[0], points[1]);
	}

	throw new Error('We should have at most two intersection points');
}

/**
 * Calculates the intersection point of a Ray (semi-infinite line) and a bounding box.
 *
 * A ray is defined by an origin (`point0`) and a through-point (`point1`). This function finds
 * the first point where the ray enters or touches the box.
 *
 * @param point0 - The origin of the ray.
 * @param point1 - A second point defining the ray's direction.
 * @param box - The bounding box to test against.
 * @returns The first intersection {@link Point}, or `null` if the ray misses the box.
 */
export function intersectRayAndBox(point0: Point, point1: Point, box: Box): Point | null {
	const s = intersectLineSegments(point0, point1, box.min, new Point(box.max.x, box.min.y));
	const n = intersectLineSegments(point0, point1, new Point(box.max.x, box.min.y), box.max);
	const a = intersectLineSegments(point0, point1, box.max, new Point(box.min.x, box.max.y));
	const c = intersectLineSegments(point0, point1, new Point(box.min.x, box.max.y), box.min);

	const h = [];
	if (s !== null && s >= 0) { h.push(s); }
	if (n !== null && n >= 0) { h.push(n); }
	if (a !== null && a >= 0) { h.push(a); }
	if (c !== null && c >= 0) { h.push(c); }

	if (h.length === 0) { return null; }
	h.sort((e: number, t: number) => e - t);

	const d = pointInBox(point0, box) ? h[0] : h[h.length - 1];
	return point0.addScaled(point1.subtract(point0), d);
}

/**
 * Calculates the intersection of two finite line segments.
 *
 * Segment A is defined by `point0` to `point1`.
 * Segment B is defined by `point2` to `point3`.
 *
 * @param point0 - Start of segment A.
 * @param point1 - End of segment A.
 * @param point2 - Start of segment B.
 * @param point3 - End of segment B.
 * @returns The scalar coefficient `t` (0 to 1) along segment A where the intersection occurs, or `null` if they do not intersect.
 */
export function intersectLineSegments(point0: Point, point1: Point, point2: Point, point3: Point): number | null {
	const z = (function(e: Point, t: Point, i: Point, s: Point): number | null {
		const r = t.subtract(e);
		const n = s.subtract(i);
		const o = r.x * n.y - r.y * n.x;
		if (Math.abs(o) < 1e-6) { return null; }
		const a = e.subtract(i);
		return (a.y * n.x - a.x * n.y) / o;
	})(point0, point1, point2, point3);

	if (z === null) { return null; }
	const o = point1.subtract(point0).scaled(z).add(point0);
	const a = distanceToSegment(point2, point3, o);
	return Math.abs(a.distance) < 1e-6 ? z : null;
}


/**
 * Clips a finite line segment to a bounding box using the Cohen-Sutherland algorithm.
 *
 * This determines which part of the segment `[p0, p1]` lies inside the box.
 *
 * @param segment - The input segment `[start, end]`.
 * @param box - The clipping boundary.
 * @returns A new {@link Segment} representing the visible portion, a single {@link Point} if clipped to a dot, or `null` if completely outside.
 */
export function intersectLineSegmentAndBox(segment: Segment, box: Box): Point | Segment | null {
	// Explicitly define types for x0, y0, x1, y1 as Coordinate
	let x0: Coordinate = segment[0].x;
	let y0: Coordinate = segment[0].y;
	let x1: Coordinate = segment[1].x;
	let y1: Coordinate = segment[1].y;
	const minX = box.min.x;
	const minY = box.min.y;
	const maxX = box.max.x;
	const maxY = box.max.y;

	// This helper function `outcode` will operate on numbers and return numbers
	function outcode(n1: number, n2: number): number {
		let z = 0; // 0000
		if (n1 < minX) z |= 1; // 0001
		else if (n1 > maxX) z |= 2; // 0010
		if (n2 < minY) z |= 4; // 0100
		else if (n2 > maxY) z |= 8; // 1000
		return z;
	}

	let accept = false; // Correctly track acceptance
	let outcode0 = outcode(x0, y0);
	let outcode1 = outcode(x1, y1);

	while (true) {
		if (!(outcode0 | outcode1)) {
			accept = true;
			break;
		} else if (outcode0 & outcode1) {
			break;
		} else {
			const currentOutcode = outcode0 || outcode1;
			let x: number = 0;
			let y: number = 0;

			if (currentOutcode & 8) { // Point is above the clip window
				x = x0 + (x1 - x0) * (maxY - y0) / (y1 - y0);
				y = maxY;
			} else if (currentOutcode & 4) { // Point is below the clip window
				x = x0 + (x1 - x0) * (minY - y0) / (y1 - y0);
				y = minY;
			} else if (currentOutcode & 2) { // Point is to the right of clip window
				y = y0 + (y1 - y0) * (maxX - x0) / (x1 - x0);
				x = maxX;
			} else if (currentOutcode & 1) { // Point is to the left of clip window
				y = y0 + (y1 - y0) * (minX - x0) / (x1 - x0);
				x = minX;
			}

			// Assigning back to Coordinate-typed variables requires an explicit cast
			if (currentOutcode === outcode0) {
				x0 = x as Coordinate;
				y0 = y as Coordinate;
				outcode0 = outcode(x0, y0);
			} else {
				x1 = x as Coordinate;
				y1 = y as Coordinate;
				outcode1 = outcode(x1, y1);
			}
		}
	}

	return accept ? (equalPoints(new Point(x0, y0), new Point(x1, y1)) ? new Point(x0, y0) : lineSegment(new Point(x0, y0), new Point(x1, y1))) : null;
}

/**
 * Calculates the shortest (perpendicular) distance from a point to an infinite line.
 *
 * The line is defined by two points, `point1` and `point2`. The target is `point0`.
 *
 * @param point0 - The target point to measure from.
 * @param point1 - First point on the line.
 * @param point2 - Second point on the line.
 * @returns An object containing the `distance` (pixels) and a `coeff` representing the projection of `point0` onto the line vector.
 */
export function distanceToLine(point0: Point, point1: Point, point2: Point): { distance: number; coeff: number } {
	const s = point1.subtract(point0);
	const r = point2.subtract(point0).dotProduct(s) / s.dotProduct(s);
	return { coeff: r, distance: point0.addScaled(s, r).subtract(point2).length() };
}

/**
 * Calculates the shortest distance from a point to a finite line segment.
 *
 * Unlike {@link distanceToLine}, this clamps the result to the segment endpoints.
 * If the perpendicular projection falls outside the segment, the distance to the closest endpoint is returned.
 *
 * @param point0 - The target point.
 * @param point1 - Start of the segment.
 * @param point2 - End of the segment.
 * @returns An object containing the `distance` and a `coeff` (0 to 1) indicating the position of the closest point on the segment.
 */
export function distanceToSegment(point0: Point, point1: Point, point2: Point): { distance: number; coeff: number } {
	const lineDist = distanceToLine(point0, point1, point2);
	if (lineDist.coeff >= 0 && lineDist.coeff <= 1) { return lineDist; }

	const n = point0.subtract(point2).length();
	const o = point1.subtract(point2).length();

	return n < o ? { coeff: 0, distance: n } : { coeff: 1, distance: o };
}

/**
 * Checks if a point lies strictly inside or on the edge of a bounding box.
 *
 * @param point - The point to test.
 * @param box - The axis-aligned bounding box.
 * @returns `true` if `min.x <= x <= max.x` and `min.y <= y <= max.y`.
 */
export function pointInBox(point: Point, box: Box): boolean {
	return point.x >= box.min.x && point.x <= box.max.x && point.y >= box.min.y && point.y <= box.max.y;
}

/**
 * Calculates the exact intersection point of two infinite lines.
 * 
 * Uses the general line equation (`Ax + By + C = 0`) determinant method.
 * 
 * @param line0 - The first infinite line.
 * @param line1 - The second infinite line.
 * @returns The intersection {@link Point}, or `null` if the lines are parallel (determinant is near zero).
 */
export function intersectLines(line0: Line, line1: Line): Point | null {
	const c = line0.a * line1.b - line1.a * line0.b;
	if (Math.abs(c) < 1e-6) { return null; }

	const x = (line0.b * line1.c - line1.b * line0.c) / c;
	const y = (line1.a * line0.c - line0.a * line1.c) / c;
	return new Point(x as Coordinate, y as Coordinate);
}

/**
 * Extends a line segment infinitely in one or both directions and then clips it to a bounding box.
 * 
 * This is the core logic for drawing Rays, Extended Lines, and Horizontal/Vertical lines
 * that must span across the visible chart area.
 *
 * @param point0 - The first control point.
 * @param point1 - The second control point (defines direction).
 * @param width - The width of the clipping area (0 to width).
 * @param height - The height of the clipping area (0 to height).
 * @param extendLeft - If `true`, the line extends infinitely past `point0`.
 * @param extendRight - If `true`, the line extends infinitely past `point1`.
 * @returns A {@link Segment} clipped to the box, a single {@link Point} if clipped to the edge, or `null` if the line misses the box entirely.
 */
export function extendAndClipLineSegment(point0: Point, point1: Point, width: number, height: number, extendLeft: boolean, extendRight: boolean): Segment | Point | null {
	if (equalPoints(point0, point1)) {
		return null; // Degenerate segment
	}

	const topLeft = new Point(0 as Coordinate, 0 as Coordinate);
	const bottomRight = new Point(width as Coordinate, height as Coordinate);
	const clippingBox = new Box(topLeft, bottomRight);

	if (extendLeft) {
		if (extendRight) {
			// Extend infinitely in both directions and clip to box
			const lineThrough = lineThroughPoints(point0, point1);

			// --- Check for null return from lineThroughPoints ---
            if (lineThrough === null) {
                return null; // Fully degenerate line
            }

			const intersection = intersectLineAndBox(lineThrough, clippingBox);
			return intersection;
		} else {
			// Extend as a ray from point1 through point0 and clip to box
			const intersection = intersectRayAndBox(point1, point0, clippingBox);
			return intersection === null || equalPoints(point1, intersection) ? null : lineSegment(point1, intersection);
		}
	}

	if (extendRight) {
		// Extend as a ray from point0 through point1 and clip to box
		const intersection = intersectRayAndBox(point0, point1, clippingBox);
		return intersection === null || equalPoints(point0, intersection) ? null : lineSegment(point0, intersection);
	} else {
		// Just clip the segment itself to the box
		const intersection = intersectLineSegmentAndBox(lineSegment(point0, point1), clippingBox);
		return intersection;
	}
}



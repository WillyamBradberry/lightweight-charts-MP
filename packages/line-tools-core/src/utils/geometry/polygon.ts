// /src/utils/geometry/polygon.ts

import { Coordinate } from 'lightweight-charts';
import { Point, HalfPlane, Line, line, halfPlaneThroughPoint, lineThroughPoints, pointInHalfPlane, equalPoints } from './point';
import { intersectLines, intersectLineSegments } from './intersections';

/**
 * Checks if a point lies inside a specific polygon.
 * 
 * This implements the **Ray Casting algorithm** (also known as the Even-Odd rule).
 * It shoots a horizontal ray from the test point and counts how many times it intersects
 * the polygon's edges. An odd number of intersections means the point is inside.
 *
 * @param point - The point to test.
 * @param polygon - An array of points defining the polygon vertices.
 * @returns `true` if the point is strictly inside the polygon.
 */
export function pointInPolygon(point: Point, polygon: Point[]): boolean {
	const x = point.x;
	const y = point.y;
	let isInside = false;

	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const xi = polygon[i].x, yi = polygon[i].y;
		const xj = polygon[j].x, yj = polygon[j].y;

		const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
		if (intersect) isInside = !isInside;
	}

	return isInside;
}

/**
 * Checks if a point lies inside a triangle defined by three vertices.
 * 
 * It uses a barycentric coordinate approach or edge-check logic. Specifically, this implementation
 * checks if the point lies on the same side of all three edges relative to the centroid (or checks intersection against medians).
 *
 * @param point - The point to test.
 * @param end0 - The first vertex.
 * @param end1 - The second vertex.
 * @param end2 - The third vertex.
 * @returns `true` if the point is inside the triangle.
 */
export function pointInTriangle(point: Point, end0: Point, end1: Point, end2: Point): boolean {
	const middle = end0.add(end1).scaled(0.5).add(end2).scaled(0.5);
	return intersectLineSegments(end0, end1, middle, point) === null
		&& intersectLineSegments(end1, end2, middle, point) === null
		&& intersectLineSegments(end2, end0, middle, point) === null;
}

/**
 * Checks if a point lies inside or on the boundary of a circle.
 * 
 * @param point - The point to test.
 * @param center - The center point of the circle.
 * @param radius - The radius of the circle in pixels.
 * @returns `true` if the distance from the point to the center is less than or equal to the radius.
 */
export function pointInCircle(point: Point, center: Point, radius: number): boolean {
	return (point.x - center.x) * (point.x - center.x) + (point.y - center.y) * (point.y - center.y) <= radius * radius;
}

/**
 * Clips an arbitrary polygon against the rectangular viewport boundaries.
 *
 * This implementation uses the Sutherland-Hodgman algorithm to iteratively clip the polygon
 * against the four edges of the screen (0, 0, Width, Height).
 *
 * @param points - The array of vertices defining the polygon.
 * @param W - The width of the viewport in pixels.
 * @param H - The height of the viewport in pixels.
 * @returns An array of points representing the clipped polygon, or `null` if the polygon is fully outside.
 */
export function clipPolygonToViewport(points: Point[], W: number, H: number): Point[] | null {
    if (points.length < 3) return null;

    let clippedPoints: Point[] = points;
    const clipPlanes = [];

    // 1. Define the four clipping planes (HalfPlanes) based on the viewport boundaries.

    // Clip against X > 0 (Left Edge)
    // Edge: x = 0 (Line: a=1, b=0, c=0). Point (1, 1) is inside.
    clipPlanes.push(halfPlaneThroughPoint(line(1, 0, 0), new Point(1 as Coordinate, 1 as Coordinate)));

    // Clip against X < W (Right Edge)
    // Edge: x = W (Line: a=1, b=0, c=-W). Point (W-1, 1) is inside.
    clipPlanes.push(halfPlaneThroughPoint(line(1, 0, -W), new Point((W - 1) as Coordinate, 1 as Coordinate)));

    // Clip against Y > 0 (Top Edge)
    // Edge: y = 0 (Line: a=0, b=1, c=0). Point (1, 1) is inside.
    clipPlanes.push(halfPlaneThroughPoint(line(0, 1, 0), new Point(1 as Coordinate, 1 as Coordinate)));

    // Clip against Y < H (Bottom Edge)
    // Edge: y = H (Line: a=0, b=1, c=-H). Point (1, H-1) is inside.
    clipPlanes.push(halfPlaneThroughPoint(line(0, 1, -H), new Point(1 as Coordinate, (H - 1) as Coordinate)));


    // 2. Iteratively clip the polygon against each plane.
    for (const plane of clipPlanes) {
        const nextClipped = intersectPolygonAndHalfPlane(clippedPoints, plane);
        if (nextClipped === null || nextClipped.length < 3) {
            return null; // Fully clipped out
        }
        clippedPoints = nextClipped;
    }

    return clippedPoints;
}

/**
 * Internal helper for polygon operations to add a point to a path.
 * 
 * Similar to `addPoint`, but specialized for polygon paths. It prevents adding a point
 * if it is identical to the *last added point* or the *first point* (to avoid degenerate segments or premature closing).
 *
 * @param points - The current list of polygon vertices.
 * @param point - The next vertex to add.
 * @returns `true` if the point was added, `false` if it was skipped.
 */
function addPointToPointsSet(points: Point[], point: Point): boolean {
	if (points.length > 0 && equalPoints(points[points.length - 1], point)) {
		return false;
	}
	if (points.length > 1 && equalPoints(points[0], point)) { // Check first point only if there are enough points
		return false;
	}
	points.push(point);
	return true;
}

/**
 * Clips a polygon against a single half-plane using the Sutherland-Hodgman algorithm logic.
 * 
 * This is a fundamental step in polygon clipping. It iterates through the polygon edges
 * and outputs a new set of vertices that lie on the "positive" side of the half-plane.
 *
 * @param points - The vertices of the subject polygon.
 * @param halfPlane - The clipping plane.
 * @returns A new array of vertices representing the clipped polygon, or `null` if the result is invalid (fewer than 3 points).
 */
export function intersectPolygonAndHalfPlane(points: Point[], halfPlane: HalfPlane): Point[] | null {
	const intersectionPoints: Point[] = [];
	for (let i = 0; i < points.length; ++i) {
		const current = points[i];
		const next = points[(i + 1) % points.length];
		
		// --- Check for null return from lineThroughPoints ---
		const segmentLine = lineThroughPoints(current, next); 

        // If the segment is degenerate (current === next), skip this iteration as no line exists
        if (segmentLine === null) {
            continue; 
        }

		// Use a temporary variable 'line' for clarity, which now holds a non-null Line object
        const line: Line = segmentLine;


		if (pointInHalfPlane(current, halfPlane)) {
			addPointToPointsSet(intersectionPoints, current);
			if (!pointInHalfPlane(next, halfPlane)) {
				const lineIntersection = intersectLines(line, halfPlane.edge);
				if (lineIntersection !== null) {
					addPointToPointsSet(intersectionPoints, lineIntersection);
				}
			}
		} else if (pointInHalfPlane(next, halfPlane)) {
			const lineIntersection = intersectLines(line, halfPlane.edge);
			if (lineIntersection !== null) {
				addPointToPointsSet(intersectionPoints, lineIntersection);
			}
		}
	}
	return intersectionPoints.length >= 3 ? intersectionPoints : null;
}


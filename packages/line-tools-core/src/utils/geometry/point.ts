// /src/utils/geometry/point.ts

import { Coordinate } from 'lightweight-charts';

// --- Local Redefinitions of Geometric Primitives (from V3.8 model/point.ts) ---

/**
 * Represents a 2D point or vector in the chart's coordinate system.
 * 
 * This class provides standard vector arithmetic operations required for geometric calculations,
 * hit testing, and rendering logic.
 */
export class Point {
	/** The x-coordinate (pixel value). */
    public x!: Coordinate;
	/** The y-coordinate (pixel value). */
    public y!: Coordinate;

    /**
     * Creates a new Point instance.
     * @param x - The x-coordinate.
     * @param y - The y-coordinate.
     */	
    public constructor(x: number, y: number)
    public constructor(x: Coordinate, y: Coordinate) {
        (this.x as Coordinate) = x;
        (this.y as Coordinate) = y;
    }

	/**
     * Adds another point/vector to this one.
     * @param point - The point to add.
     * @returns A new Point representing the sum (`this + point`).
     */
    public add(point: Point): Point {
        return new Point(this.x + point.x, this.y + point.y);
    }

    /**
     * Adds a scaled version of another point/vector to this one.
     * Useful for linear interpolations or projections.
     * 
     * @param point - The direction vector to add.
     * @param scale - The scalar factor to multiply `point` by before adding.
     * @returns A new Point representing (`this + (point * scale)`).
     */	
    public addScaled(point: Point, scale: number): Point {
        return new Point(this.x + scale * point.x, this.y + scale * point.y);
    }

    /**
     * Subtracts another point/vector from this one.
     * @param point - The point to subtract.
     * @returns A new Point representing the difference (`this - point`).
     */	
    public subtract(point: Point): Point {
        return new Point(this.x - point.x, this.y - point.y);
    }

    /**
     * Calculates the dot product of this vector and another.
     * Formula: `x1*x2 + y1*y2`.
     * 
     * @param point - The other vector.
     * @returns The scalar dot product.
     */	
    public dotProduct(point: Point): number {
        return this.x * point.x + this.y * point.y;
    }

    /**
     * Calculates the 2D cross product (determinant) magnitude of this vector and another.
     * Formula: `x1*y2 - y1*x2`.
     * 
     * @param point - The other vector.
     * @returns The scalar cross product.
     */	
    public crossProduct(point: Point): number {
        return this.x * point.y - this.y * point.x;
    }

    /**
     * Calculates the signed angle between this vector and another.
     * 
     * @param point - The other vector.
     * @returns The angle in radians (range -π to π).
     */	
    public signedAngle(point: Point): number {
        return Math.atan2(this.crossProduct(point), this.dotProduct(point));
    }

    /**
     * Calculates the unsigned angle between this vector and another.
     * 
     * @param point - The other vector.
     * @returns The angle in radians (range 0 to π).
     */	
    public angle(point: Point): number {
        return Math.acos(this.dotProduct(point) / (this.length() * point.length()));
    }

    /**
     * Calculates the Euclidean length (magnitude) of the vector.
     * @returns The length of the vector.
     */	
    public length(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    /**
     * Multiplies the vector by a scalar value.
     * @param scale - The scaling factor.
     * @returns A new scaled Point.
     */	
    public scaled(scale: number): Point {
        return new Point(this.x * scale, this.y * scale);
    }

   /**
     * Returns a normalized version of the vector (unit vector with length 1).
     * @returns A new Point with the same direction but length 1. Returns (0,0) if original length is 0.
     */	
    public normalized(): Point {
        const len = this.length();
        if (len === 0) return new Point(0 as Coordinate, 0 as Coordinate);
        return new Point(this.x / len as Coordinate, this.y / len as Coordinate);
    }

    /**
     * Returns a perpendicular vector rotated 90 degrees counter-clockwise.
     * Maps `(x, y)` to `(-y, x)`.
     * 
     * @returns A new transposed Point.
     */	
    public transposed(): Point {
        return new Point(-this.y, this.x);
    }

    /**
     * Creates a deep copy of this Point.
     * @returns A new Point instance with identical coordinates.
     */	
    public clone(): Point {
        return new Point(this.x, this.y);
    }
}

/**
 * Represents an Axis-Aligned Bounding Box (AABB) defined by two corner points.
 * 
 * The box is normalized upon construction so that `min` always contains the 
 * smallest x and y values, and `max` contains the largest.
 */
export class Box {
    public min: Point;
    public max: Point;

    public constructor(a: Point, b: Point) {
        this.min = new Point(Math.min(a.x, b.x) as Coordinate, Math.min(a.y, b.y) as Coordinate);
        this.max = new Point(Math.max(a.x, b.x) as Coordinate, Math.max(a.y, b.y) as Coordinate);
    }
}

/**
 * Represents a geometric half-plane, defined by a dividing line (edge) and a boolean 
 * indicating which side of the line is considered "inside" or positive.
 * 
 * Used primarily for polygon clipping algorithms (e.g., Sutherland-Hodgman).
 */
export class HalfPlane {
    public edge: Line;
    public isPositive: boolean;

    public constructor(edge: Line, isPositive: boolean) {
        this.edge = edge;
        this.isPositive = isPositive;
    }
}

/**
 * Interface representing a line in the general equation form: `ax + by + c = 0`.
 * 
 * This form is preferred over slope-intercept for geometric algorithms because it 
 * handles vertical lines natively without division by zero.
 */
export interface Line {
    a: number;
    b: number;
    c: number;
}

/**
 * A type alias representing a finite line segment defined by exactly two points: `[Start, End]`.
 */
export type Segment = [Point, Point];

// #region Point & Geometric Primitives (from V3.8 model/point.ts)
// Note: The Point class and related primitives are moved here as they are fundamental geometry utilities.

/**
 * Checks if two points are geometrically identical.
 * 
 * @param a - The first point.
 * @param b - The second point.
 * @returns `true` if both x and y coordinates match exactly, otherwise `false`.
 */
export function equalPoints(a: Point, b: Point): boolean {
	return a.x === b.x && a.y === b.y;
}

/**
 * Factory function to create a {@link Line} object from coefficients.
 * 
 * Creates a line object satisfying the equation `ax + by + c = 0`.
 * 
 * @param a - The 'a' coefficient (coefficient of x).
 * @param b - The 'b' coefficient (coefficient of y).
 * @param c - The 'c' constant term.
 * @returns A {@link Line} object.
 */
export function line(a: number, b: number, c: number): Line {
	return { a, b, c };
}

/**
 * Constructs a {@link Line} that passes through two distinct points.
 * 
 * Derives the general equation coefficients `a`, `b`, and `c` based on the coordinates
 * of the provided points.
 * 
 * @param a - The first point.
 * @param b - The second point.
 * @returns A {@link Line} object representing the infinite line through `a` and `b`.
 */
export function lineThroughPoints(a: Point, b: Point): Line {
	return line(a.y - b.y, b.x - a.x, a.x * b.y - b.x * a.y);
}

/**
 * Factory function to create a {@link Segment} tuple.
 * 
 * @param a - The start point.
 * @param b - The end point.
 * @returns A tuple `[a, b]`.
 * @throws Error if `a` and `b` are the same point (segments must be distinct).
 */
export function lineSegment(a: Point, b: Point): Segment {
	if (equalPoints(a, b)) { throw new Error('Points of a segment should be distinct'); }
	return [a, b];
}

/**
 * Constructs a {@link HalfPlane} defined by a boundary edge and a reference point.
 * 
 * The resulting half-plane includes the side of the `edge` line where `point` resides.
 * 
 * @param edge - The infinite line defining the boundary.
 * @param point - A point strictly inside the desired half-plane.
 * @returns A {@link HalfPlane} object.
 */
export function halfPlaneThroughPoint(edge: Line, point: Point): HalfPlane {
	return new HalfPlane(edge, edge.a * point.x + edge.b * point.y + edge.c > 0);
}

/**
 * Checks if a specific point lies within a defined {@link HalfPlane}.
 *
 * It evaluates the line equation `ax + by + c` at the point's coordinates and compares
 * the sign of the result against the half-plane's positive/negative orientation.
 *
 * @param point - The point to test.
 * @param halfPlane - The geometric half-plane definition.
 * @returns `true` if the point is strictly inside the half-plane, `false` otherwise.
 */
export function pointInHalfPlane(point: Point, halfPlane: HalfPlane): boolean {
	const edge = halfPlane.edge;
	return (edge.a * point.x + edge.b * point.y + edge.c > 0) === halfPlane.isPositive;
}

/**
 * Checks if two bounding boxes are geometrically identical.
 *
 * Equality requires that both the `min` and `max` points of the boxes match exactly.
 *
 * @param a - The first bounding box.
 * @param b - The second bounding box.
 * @returns `true` if the boxes occupy exactly the same space.
 */
export function equalBoxes(a: Box, b: Box): boolean {
	return equalPoints(a.min, b.min) && equalPoints(a.max, b.max);
}

// #endregion

/**
 * Rotates a point around a specific pivot by a given angle.
 * 
 * This is essential for rendering rotated text boxes and shapes.
 * 
 * @param point - The point to rotate.
 * @param pivot - The center point of rotation.
 * @param angle - The rotation angle in radians (positive values rotate clockwise in canvas coordinates).
 * @returns A new {@link Point} representing the rotated position.
 */
export function rotatePoint(point: Point, pivot: Point, angle: number): Point {
	if (angle === 0) { return point.clone(); } // No rotation needed
	const x = (point.x - pivot.x) * Math.cos(angle) - (point.y - pivot.y) * Math.sin(angle) + pivot.x;
	const y = (point.x - pivot.x) * Math.sin(angle) + (point.y - pivot.y) * Math.cos(angle) + pivot.y;
	return new Point(x, y);
}

// #endregion Text-related Geometry Helpers

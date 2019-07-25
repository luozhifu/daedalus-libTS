import { DDLSRandGenerator } from "./DDLSRandGenerator";
import { DDLSFace } from "../DDLSFace";
import { DDLSVertex } from "../DDLSVertex";
import { DDLSPoint2D } from "./DDLSPoint2D";
import { DDLSMesh } from "../DDLSMesh";
import { IteratorFromVertexToHoldingFaces } from "../../iterators/IteratorFromVertexToHoldingFaces";
import { DDLSEdge } from "../DDLSEdge";
import { IteratorFromFaceToInnerEdges } from "../../iterators/IteratorFromFaceToInnerEdges";
import { DDLSConstants } from "../DDLSConstants";


export class DDLSGeom2D
{
	
	
	private static _randGen:DDLSRandGenerator;
	
	// return one the following, in priority order:
	// - an existant vertex (if (x, y) lies on this vertex)
	// or 
	// - an existant edge (if (x, y) lies on this edge )
	// or
	// - an existant face (if (x, y) lies on this face )
	// or
	// - null if outside mesh
	// YOU SHOULD USE THIS FUNCTION ONLY FOR COORDINATES INSIDE SAFE AREA
	private static __samples:DDLSVertex[] = [];
	public static locatePosition(x:number, y:number, mesh:DDLSMesh):Object
	{
		// jump and walk algorithm
		
		if (!DDLSGeom2D._randGen)
			DDLSGeom2D._randGen = new DDLSRandGenerator();
		DDLSGeom2D._randGen.seed = x*10 + 4*y;
		
		var i:number;
		
		this.__samples.splice(0, this.__samples.length);
		var numSamples:number = Math.pow(mesh.__vertices.length, 1/3);
		DDLSGeom2D._randGen.rangeMin = 0;
		DDLSGeom2D._randGen.rangeMax = mesh.__vertices.length-1;
		for (i=0 ; i<numSamples ; i++)
			this.__samples.push(mesh.__vertices[DDLSGeom2D._randGen.next()]);
		
		var currVertex:DDLSVertex;
		var currVertexPos:DDLSPoint2D;
		var distSquared:number;
		var minDistSquared:number = Number.MAX_VALUE;
		var closedVertex:DDLSVertex;
		for ( i=0 ; i<numSamples ; i++ )
		{
			currVertex = this.__samples[i];
			currVertexPos = currVertex.pos;
			distSquared = (currVertexPos.x - x)*(currVertexPos.x - x) + (currVertexPos.y - y)*(currVertexPos.y - y);
			if ( distSquared < minDistSquared )
			{
				minDistSquared = distSquared;
				closedVertex = currVertex;
			}
		}
		
		var currFace:DDLSFace;
		var iterFace:IteratorFromVertexToHoldingFaces = new IteratorFromVertexToHoldingFaces();
		iterFace.fromVertex = closedVertex;
		currFace = iterFace.next();
		
		var faceVisited:any = {};
		var currEdge:DDLSEdge;
		var iterEdge:IteratorFromFaceToInnerEdges = new IteratorFromFaceToInnerEdges();
		var objectContainer:Object;
		var relativPos:number;
		var numIter:number = 0;
		while ( faceVisited[currFace.id] || ! (objectContainer = this.isInFace(x, y, currFace)) )
		{
			faceVisited[currFace.id] = true;
			
			numIter++;
			if (numIter == 50)
			{
				console.log("WALK TAKE MORE THAN 50 LOOP");
				//objectContainer = null;
				//break;
				//throw new Error("WALK TAKE MORE THAN 50 LOOP");
			}
			if (numIter == 1000)
			{
				console.log("WALK TAKE MORE THAN 1000 LOOP -> WE ESCAPE");
				objectContainer = null;
				break;
				//throw new Error("WALK TAKE MORE THAN 50 LOOP");
			}
			iterEdge.fromFace = currFace;
			do
			{
				currEdge = iterEdge.next();
				if (currEdge == null)
				{
					console.log("KILL PATH");
					return null;
				}
				relativPos = this.getRelativePosition(x, y, currEdge);
			}
			while ( relativPos == 1 || relativPos == 0 )
			
			currFace = currEdge.rightFace;
		}
		
		return objectContainer;
	}
	
	/**
	 *  圆形是否与任何约束交叉
	 * @param x
	 * @param y
	 * @param radius
	 * @param mesh
	 * @return
	 */		
	public static isCircleIntersectingAnyConstraint(x:number, y:number, radius:number, mesh:DDLSMesh):boolean
	{
		if (x <= 0 || x >= mesh.width || y <= 0 || y >= mesh.height )
			return true;
		
		var loc:Object = DDLSGeom2D.locatePosition(x, y, mesh);
		var face:DDLSFace;
		if (loc instanceof  DDLSVertex)
			face = (<DDLSVertex> loc).edge.leftFace;
		else if (loc instanceof  DDLSEdge)
			face = (<DDLSEdge> loc).leftFace;
		else
			face = <DDLSFace> loc;
		
		// if a vertex is in the circle, a contrainst must intersect the circle
		// because a vertex always belongs to a contrained edge
		var radiusSquared:number = radius*radius;
		var pos:DDLSPoint2D;
		var distSquared:number;
		pos = face.edge.originVertex.pos;
		distSquared = (pos.x - x)*(pos.x - x) + (pos.y - y)*(pos.y - y);
		if (distSquared <= radiusSquared)
		{
			return true;
		}
		pos = face.edge.nextLeftEdge.originVertex.pos;
		distSquared = (pos.x - x)*(pos.x - x) + (pos.y - y)*(pos.y - y);
		if (distSquared <= radiusSquared)
		{
			return true;
		}
		pos = face.edge.nextLeftEdge.nextLeftEdge.originVertex.pos;
		distSquared = (pos.x - x)*(pos.x - x) + (pos.y - y)*(pos.y - y);
		if (distSquared <= radiusSquared)
		{
			return true;
		}
		
		// check if edge intersects
		var edgesToCheck:DDLSEdge[] = [];
		edgesToCheck.push(face.edge);
		edgesToCheck.push(face.edge.nextLeftEdge);
		edgesToCheck.push(face.edge.nextLeftEdge.nextLeftEdge);
		
		var edge:DDLSEdge;
		var pos1:DDLSPoint2D;
		var pos2:DDLSPoint2D;
		var checkedEdges:any = {};
		var intersecting:boolean;
		while (edgesToCheck.length > 0)
		{
			edge = edgesToCheck.pop();
			checkedEdges[edge.id] = true;
			pos1 = edge.originVertex.pos;
			pos2 = edge.destinationVertex.pos;
			intersecting = this.intersectionsSegmentCircle(pos1.x, pos1.y, pos2.x, pos2.y,x, y, radius);
			if (intersecting)
			{
				if ( edge.isConstrained)
					return true;
				else
				{
					edge = edge.oppositeEdge.nextLeftEdge;
					if (!checkedEdges[edge.id] && !checkedEdges[edge.oppositeEdge.id]
						&& edgesToCheck.indexOf(edge) == -1 && edgesToCheck.indexOf(edge.oppositeEdge) == -1)
					{
						edgesToCheck.push(edge);
					}
					edge = edge.nextLeftEdge;
					if (!checkedEdges[edge.id] && !checkedEdges[edge.oppositeEdge.id]
						&& edgesToCheck.indexOf(edge) == -1 && edgesToCheck.indexOf(edge.oppositeEdge) == -1)
					{
						edgesToCheck.push(edge);
					}
				}
			}
		}
		
		return false;
	}
	
	// return the relative direction from (x1,y1), to (x3,y3) through (x2, y2)
	// the function returns:
	// 0 if the path is a straight line
	// 1 if the path goes to the left
	// -1 if the path goes to the right
	public static getDirection(x1:number, y1:number
										, x2:number, y2:number
										, x3:number, y3:number):number
	{
		
		// dot product with the orthogonal vector pointing left vector of eUp:
		var dot:number = (x3 - x1) * (y2 - y1) + (y3 - y1) * (- x2 + x1);
		
		// check sign
		return (dot == 0) ? 0 : ((dot > 0) ? 1 : -1);
	}
	
	// second version of getDirection. More accurate and safer version
	// return the relative direction from (x1,y1), to (x3,y3) through (x2, y2)
	// the function returns:
	// 0 if the path is a straight line
	// 1 if the path goes to the left
	// -1 if the path goes to the right
	public static getDirection2(x1:number, y1:number
										, x2:number, y2:number
										, x3:number, y3:number):number
	{
		// dot product with the orthogonal vector pointing left vector of eUp:
		var dot:number = (x3 - x1) * (y2 - y1) + (y3 - y1) * (- x2 + x1);
		
		// check sign
		if (dot == 0)
		{
			return 0;
		}
		else if (dot > 0)
		{
			if ( this.distanceSquaredPointToLine(x3, y3, x1, y1, x2, y2) <= DDLSConstants.EPSILON_SQUARED )
				return 0;
			else
				return 1;
		}
		else
		{
			if ( this.distanceSquaredPointToLine(x3, y3, x1, y1, x2, y2) <= DDLSConstants.EPSILON_SQUARED )
				return 0;
			else
				return -1;
		}
	}
	
	// eUp <an> seen infinite line splits the 2D space in 2 parts (left and right),
	// the function returns:
	//   0 if the (x, y) lies on the line
	//   1 if the (x, y) lies at left
	//   -1 if the (x, y) lies at right
	public static getRelativePosition(x:number, y:number, eUp:DDLSEdge):number
	{
		return this.getDirection(eUp.originVertex.pos.x, eUp.originVertex.pos.y
							, eUp.destinationVertex.pos.x, eUp.destinationVertex.pos.y
							, x, y);
		
		/*
		parametric expression of pointing up edge eUp
		x(t1) = vOrigin.x + t1*(vDestination.x - vOrigin.x)
		y(t1) = vOrigin.y + t1*(vDestination.y - vOrigin.y)
		
		and orthogonal edge pointing right to eUp 
		x(t2) = vOrigin.x + t2*(vDestination.y - vOrigin.y)
		y(t2) = vOrigin.y - t2*(vDestination.x - vOrigin.x)
		
		(x, y) position can be <a> expressed linear combination of the 2 previous segments
		x = vOrigin.x + t2*(vDestination.y - vOrigin.y) + t1*(vDestination.x - vOrigin.x)
		y = vOrigin.y + t1*(vDestination.y - vOrigin.y) - t2*(vDestination.x - vOrigin.x)
		
		---> the sign of t2 will inform us if vToCheck lies at right or left of eUp
		*/
		
		// set alias letters
		/*
		var a:number = x;
		var b:number = y;
		var c:number = vOrigin.pos.x;
		var d:number = vOrigin.pos.y;
		var e:number = vDestination.pos.x;
		var f:number = vDestination.pos.y;
		*/
		
		/*
		system to solve:
		a = c + t2 (f - d) + t1 (e - c)
		b = d + t1 (f - d) - t2 (e - c)
		*/
		
		// giving to wolfram: Solve[{a = c + t2 (f - d) + t1 (e - c) , b = d + t1 (f - d) - t2 (e - c)}, {t1, t2}]
		// we get:
		/*
		var t2:number = (-a*d + a*f + b*c - b*e - c*f + d*e) / (c*c - 2*c*e + d*d - 2*d*f + e*e + f*f);
		
		var result:number;
		if ( t2 == 0 )
			result = 0;
		else if ( t2 < 0 )
			result = -1;
		else
			result = 1;
		
		return result;
		*/
	}
	
	public static getRelativePosition2(x:number, y:number, eUp:DDLSEdge):number
	{
		return this.getDirection2(eUp.originVertex.pos.x, eUp.originVertex.pos.y
							, eUp.destinationVertex.pos.x, eUp.destinationVertex.pos.y
							, x, y);
	}
	
	// the function checks by priority:
	// - if the (x, y) lies on a vertex of the polygon, it will return this vertex
	// - if the (x, y) lies on a edge of the polygon, it will return this edge
	// - if the (x, y) lies inside the polygon, it will return the polygon
	// - if the (x, y) lies outside the polygon, it will return null
	public static isInFace(x:number, y:number, polygon:DDLSFace):Object
	{
		// remember polygons are triangle only,
		// and we suppose we have not degenerated flat polygons !
		
		var result:Object;
		
		var e1_2:DDLSEdge = polygon.edge;
		var e2_3:DDLSEdge = e1_2.nextLeftEdge;
		var e3_1:DDLSEdge = e2_3.nextLeftEdge;
		if ( this.getRelativePosition(x, y, e1_2) >= 0 && this.getRelativePosition(x, y, e2_3) >= 0 && this.getRelativePosition(x, y, e3_1) >= 0 )
		{
			var v1:DDLSVertex = e1_2.originVertex;
			var v2:DDLSVertex = e2_3.originVertex;
			var v3:DDLSVertex = e3_1.originVertex;
			
			var x1:number = v1.pos.x;
			var y1:number = v1.pos.y;
			var x2:number = v2.pos.x;
			var y2:number = v2.pos.y;
			var x3:number = v3.pos.x;
			var y3:number = v3.pos.y;
			
			var v_v1squaredLength:number = (x1 - x)*(x1 - x) + (y1 - y)*(y1 - y);
			var v_v2squaredLength:number = (x2 - x)*(x2 - x) + (y2 - y)*(y2 - y);
			var v_v3squaredLength:number = (x3 - x)*(x3 - x) + (y3 - y)*(y3 - y);
			var v1_v2squaredLength:number = (x2 - x1)*(x2 - x1) + (y2 - y1)*(y2 - y1);
			var v2_v3squaredLength:number = (x3 - x2)*(x3 - x2) + (y3 - y2)*(y3 - y2);
			var v3_v1squaredLength:number = (x1 - x3)*(x1 - x3) + (y1 - y3)*(y1 - y3);
			
			var dot_v_v1v2:number = (x - x1)*(x2 - x1) + (y - y1)*(y2 - y1);
			var dot_v_v2v3:number = (x - x2)*(x3 - x2) + (y - y2)*(y3 - y2);
			var dot_v_v3v1:number = (x - x3)*(x1 - x3) + (y - y3)*(y1 - y3);
			
			var v_e1_2squaredLength:number = v_v1squaredLength - dot_v_v1v2 * dot_v_v1v2 / v1_v2squaredLength;
			var v_e2_3squaredLength:number = v_v2squaredLength - dot_v_v2v3 * dot_v_v2v3 / v2_v3squaredLength;
			var v_e3_1squaredLength:number = v_v3squaredLength - dot_v_v3v1 * dot_v_v3v1 / v3_v1squaredLength;
			
			var closeTo_e1_2:boolean = v_e1_2squaredLength <= DDLSConstants.EPSILON_SQUARED;
			var closeTo_e2_3:boolean = v_e2_3squaredLength <= DDLSConstants.EPSILON_SQUARED;
			var closeTo_e3_1:boolean = v_e3_1squaredLength <= DDLSConstants.EPSILON_SQUARED;
			
			if ( closeTo_e1_2 )
			{
				if ( closeTo_e3_1 )
					result = v1;
				else if ( closeTo_e2_3 )
					result = v2;
				else
					result = e1_2;
			}
			else if ( closeTo_e2_3 )
			{
				if ( closeTo_e3_1 )
					result = v3;
				else
					result = e2_3;
			}
			else if ( closeTo_e3_1 )
				result = e3_1;
			else
				result = polygon;
		}
		
		return result;
		
		// we will use barycentric coordinates
		// see http://en.wikipedia.org/wiki/Barycentric_coordinate_system
		/*
		var e1_2:QEEdge = polygon.edge;
		var e2_3:QEEdge = e1_2.nextLeftEdge;
		var e3_1:QEEdge = e2_3.nextLeftEdge;
		
		var v1:QEVertex = e1_2.originVertex;
		var v2:QEVertex = e2_3.originVertex;
		var v3:QEVertex = e3_1.originVertex;
		
		var x1:number = v1.pos.x;
		var y1:number = v1.pos.y;
		var x2:number = v2.pos.x;
		var y2:number = v2.pos.y;
		var x3:number = v3.pos.x;
		var y3:number = v3.pos.y;
		
		var coef1:number = ((y2 - y3)*(x - x3) + (x3 - x2)*(y - y3)) / ((y2 - y3)*(x1 - x3) + (x3 - x2)*(y1 - y3));
		var coef2:number = ((y3 - y1)*(x - x3) + (x1 - x3)*(y - y3)) / ((y2 - y3)*(x1 - x3) + (x3 - x2)*(y1 - y3));
		var coef3:number = 1 - coef1 - coef2;
		
		console.log("isInFace:", coef1, coef2, coef3);
		
		var result:Object;
		if ( 0 <= coef1 && coef1 <= 1 && 0 <= coef2 && coef2 <= 1 && 0 <= coef3 && coef3 <= 1 )
		{
			var v_v1squaredLength:number = (x1 - x)*(x1 - x) + (y1 - y)*(y1 - y);
			var v_v2squaredLength:number = (x2 - x)*(x2 - x) + (y2 - y)*(y2 - y);
			var v_v3squaredLength:number = (x3 - x)*(x3 - x) + (y3 - y)*(y3 - y);
			var v1_v2squaredLength:number = (x2 - x1)*(x2 - x1) + (y2 - y1)*(y2 - y1);
			var v2_v3squaredLength:number = (x3 - x2)*(x3 - x2) + (y3 - y2)*(y3 - y2);
			var v3_v1squaredLength:number = (x1 - x3)*(x1 - x3) + (y1 - y3)*(y1 - y3);
			
			var dot_v_v1v2:number = (x - x1)*(x2 - x1) + (y - y1)*(y2 - y1);
			var dot_v_v2v3:number = (x - x2)*(x3 - x2) + (y - y2)*(y3 - y2);
			var dot_v_v3v1:number = (x - x3)*(x1 - x3) + (y - y3)*(y1 - y3);
				
			var v_e1_2squaredLength:number = v_v1squaredLength - dot_v_v1v2 * dot_v_v1v2 / v1_v2squaredLength;
			var v_e2_3squaredLength:number = v_v2squaredLength - dot_v_v2v3 * dot_v_v2v3 / v2_v3squaredLength;
			var v_e3_1squaredLength:number = v_v3squaredLength - dot_v_v3v1 * dot_v_v3v1 / v3_v1squaredLength;
			
			var closeTo_e1_2:boolean = v_e1_2squaredLength <= QEConstants.EPSILON_SQUARED;
			var closeTo_e2_3:boolean = v_e2_3squaredLength <= QEConstants.EPSILON_SQUARED;
			var closeTo_e3_1:boolean = v_e3_1squaredLength <= QEConstants.EPSILON_SQUARED;
			
			if ( closeTo_e1_2 )
			{
				if ( closeTo_e3_1 )
					result = v1;
				else if ( closeTo_e2_3 )
					result = v2;
				else
					result = e1_2;
			}
			else if ( closeTo_e2_3 )
			{
				if ( closeTo_e3_1 )
					result = v3;
				else
					result = e2_3;
			}
			else if ( closeTo_e3_1 )
				result = e3_1;
			else
				result = polygon;
		}
		
		return result;
		
		*/
		
		
		/*
		parametric expression of eLeft:
		x(t1) = vCorner.x + t1*(vLeft.x - vCorner.x)
		x(t1) = vCorner.y + t1*(vLeft.y - vCorner.y)
		
		for eRight:
		x(t2) = vCorner.x + t2*(vRight.x - vCorner.x)
		x(t2) = vCorner.y + t2*(vRight.y - vCorner.y)
		
		(x, y) position can be <a> expressed linear combination of the 2 previous segments
		
		x = vCorner.x + t1*(vLeft.x - vCorner.x) + t2*(vRight.x - vCorner.x)
		y = vCorner.y + t1*(vLeft.y - vCorner.y) + t2*(vRight.y - vCorner.y)
		
		values of t1, t2 and s=t1+t2 will inform us if vToCheck lies in the polygon
		*/
		/*
		// set alias letters
		var a:number = x;
		var b:number = y;
		var c:number = vCorner.pos.x;
		var d:number = vCorner.pos.y;
		var e:number = vLeft.pos.x;
		var f:number = vLeft.pos.y;
		var g:number = vRight.pos.x;
		var h:number = vRight.pos.y;
		
		/*
		system to solve:
		a = c + t1 (e - c) + t2 (g - c)
		b = d + t1 (f - d) + t2 (h - d)
		*/
		/*
		// giving to wolfram: Solve[{a = c + t1 (e - c) + t2 (g - c) , b = d + t1 (f - d) + t2 (h - d)}, {t1, t2}]
		// we get:
		var denominator:number = (c*(f - h) + d*(g - e) + e*h - f*g);
		var t1:number = (a*(h - d) + b*(c - g) - c*h + d*g) / denominator;
		var t2:number = (a*(f - d) + b*(c - e) - c*f + d*e) / -denominator;
		// then we deduce:
		var s:number = t1 + t2;
		
		var result:Object;
		// if inside triangle:
		if (0 <= t1 && t1 <=1 && 0 <= t2 && t2 <=1 && 0 <= s && s <=1)
		{
			if (t2*((g - c)*(g - c) + (h - d)*(h - d)) <= QEConstants.EPSILON_SQUARED)
			// if near vCorner:
			if (((c - a)*(c - a) + (d - b)*(d - b)) <= QEConstants.EPSILON_SQUARED)
				result = vCorner;
			// if near vLeft:
			else if (((e - a)*(e - a) + (f - b)*(f - b)) <= QEConstants.EPSILON_SQUARED)
				result = vLeft;
			// if near vRight:
			else if (((g - a)*(g - a) + (h - b)*(h - b)) <= QEConstants.EPSILON_SQUARED)
				result = vRight;
			else
				result = polygon;
		}
		else
			result = null;
		
		return result;*/
	}
	
	// return:
	// - true if the segment is totally or partially in the triangle
	// - false if the segment is totally outside the triangle
	public static clipSegmentByTriangle(s1x:number, s1y:number, s2x:number, s2y:number
												, t1x:number, t1y:number, t2x:number, t2y:number, t3x:number, t3y:number
												, pResult1:DDLSPoint2D=null, pResult2:DDLSPoint2D=null):boolean
	{
		var side1_1:number;
		var side1_2:number;
		side1_1 = this.getDirection( t1x, t1y, t2x, t2y, s1x, s1y );
		side1_2 = this.getDirection( t1x, t1y, t2x, t2y, s2x, s2y );
		// if both segment points are on right side
		if ( side1_1 <= 0 && side1_2 <= 0 )
			return false;
		
		var side2_1:number;
		var side2_2:number;
		side2_1 = this.getDirection( t2x, t2y, t3x, t3y, s1x, s1y );
		side2_2 = this.getDirection( t2x, t2y, t3x, t3y, s2x, s2y );
		// if both segment points are on right side
		if ( side2_1 <= 0 && side2_2 <= 0 )
			return false;
		
		var side3_1:number;
		var side3_2:number;
		side3_1 = this.getDirection( t3x, t3y, t1x, t1y, s1x, s1y );
		side3_2 = this.getDirection( t3x, t3y, t1x, t1y, s2x, s2y );
		// if both segment points are on right side
		if ( side3_1 <= 0 && side3_2 <= 0 )
			return false;
		
		// both segment points are in triangle
		if ( (side1_1 >= 0 && side2_1 >= 0 && side3_1 >= 0) && (side1_2 >= 0 && side2_2 >= 0 && side3_2 >= 0) )
		{
			pResult1.x = s1x;
			pResult1.y = s1y;
			pResult2.x = s2x;
			pResult2.y = s2y;
			return true;
		}
		
		var n:number = 0;
		// check intersection between segment and 1st side triangle
		if ( this.intersections2segments(s1x, s1y, s2x, s2y, t1x, t1y, t2x, t2y, pResult1, null) )
		{
			n++;
		}
		
		// if no intersection with 1st side triangle
		if (n == 0)
		{
			// check intersection between segment and 1st side triangle
			if ( this.intersections2segments(s1x, s1y, s2x, s2y, t2x, t2y, t3x, t3y, pResult1, null) )
			{
				n++;
			}
		}
		else
		{
			if ( this.intersections2segments(s1x, s1y, s2x, s2y, t2x, t2y, t3x, t3y, pResult2, null) )
			{
				// we check if the segment is not on t2 triangle point
				if (   -DDLSConstants.EPSILON > pResult1.x - pResult2.x
					|| pResult1.x - pResult2.x > DDLSConstants.EPSILON
					|| -DDLSConstants.EPSILON > pResult1.y - pResult2.y
					|| pResult1.y - pResult2.y > DDLSConstants.EPSILON)
				{
					n++;
				}
			}
		}
		
		// if intersection neither 1st nor 2nd side triangle
		if (n == 0)
		{
			if ( this.intersections2segments(s1x, s1y, s2x, s2y, t3x, t3y, t1x, t1y, pResult1, null) )
			{
				n++;
			}
		}
		else if (n == 1)
		{
			if ( this.intersections2segments(s1x, s1y, s2x, s2y, t3x, t3y, t1x, t1y, pResult2, null) )
			{
				if (   -DDLSConstants.EPSILON > pResult1.x - pResult2.x
					|| pResult1.x - pResult2.x > DDLSConstants.EPSILON
					|| -DDLSConstants.EPSILON > pResult1.y - pResult2.y
					|| pResult1.y - pResult2.y > DDLSConstants.EPSILON)
				{
					n++;
				}
			}
		}
		
		// if one intersection, we identify the segment point in the triangle
		if (n==1)
		{
			if ( side1_1 >= 0 && side2_1 >= 0 && side3_1 >= 0 )
			{
				pResult2.x = s1x;
				pResult2.y = s1y;
			}
			else if ( side1_2 >= 0 && side2_2 >= 0 && side3_2 >= 0 )
			{
				pResult2.x = s2x;
				pResult2.y = s2y;
			}
			else
			{
				// 1 intersection and none point in triangle : degenerate case
				n = 0;
			}
		}
		
		if (n > 0)
			return true;
		else
			return false;
	}
	
	// test if the segment intersects or lies inside the triangle
	public static isSegmentIntersectingTriangle(s1x:number, s1y:number, s2x:number, s2y:number
														, t1x:number, t1y:number, t2x:number, t2y:number, t3x:number, t3y:number):boolean
	{
		// check sides
		
		var side1_1:number;
		var side1_2:number;
		side1_1 = this.getDirection( t1x, t1y, t2x, t2y, s1x, s1y );
		side1_2 = this.getDirection( t1x, t1y, t2x, t2y, s2x, s2y );
		// if both segment points are on right side
		if ( side1_1 <= 0 && side1_2 <= 0 )
			return false;
		
		var side2_1:number;
		var side2_2:number;
		side2_1 = this.getDirection( t2x, t2y, t3x, t3y, s1x, s1y );
		side2_2 = this.getDirection( t2x, t2y, t3x, t3y, s2x, s2y );
		// if both segment points are on right side
		if ( side2_1 <= 0 && side2_2 <= 0 )
			return false;
		
		var side3_1:number;
		var side3_2:number;
		side3_1 = this.getDirection( t3x, t3y, t1x, t1y, s1x, s1y );
		side3_2 = this.getDirection( t3x, t3y, t1x, t1y, s2x, s2y );
		// if both segment points are on right side
		if ( side3_1 <= 0 && side3_2 <= 0 )
			return false;
		
		// if 1st segment point is inside triangle
		if (side1_1 == 1 && side2_1 == 1 && side3_1 == 1)
			return true;
		
		// if 2st segment point is inside triangle
		if (side1_1 == 1 && side2_1 == 1 && side3_1 == 1)
			return true;
		
		var side1:number;
		var side2:number;
		// if both segment points are on different sides of the 1st triangle side
		if ( (side1_1 == 1 && side1_2 <= 0) || (side1_1 <= 0 && side1_2 == 1) )
		{
			side1 = this.getDirection(s1x, s1y, s2x, s2y, t1x, t1y);
			side2 = this.getDirection(s1x, s1y, s2x, s2y, t2x, t2y);
			if ( side1 == 1 && side2 <= 0 || side1 <= 0 && side2 == 1 )
			{
				return true;
			}
		}
		// if both segment points are on different sides of the 2nd triangle side
		if ( (side2_1 == 1 && side2_2 <= 0) || (side2_1 <= 0 && side2_2 == 1) )
		{
			side1 = this.getDirection(s1x, s1y, s2x, s2y, t2x, t2y);
			side2 = this.getDirection(s1x, s1y, s2x, s2y, t3x, t3y);
			if ( side1 == 1 && side2 <= 0 || side1 <= 0 && side2 == 1 )
			{
				return true;
			}
		}
		// if both segment points are on different sides of the 3rd triangle side
		if ( (side3_1 == 1 && side3_2 <= 0) || (side3_1 <= 0 && side3_2 == 1) )
		{
			side1 = this.getDirection(s1x, s1y, s2x, s2y, t3x, t3y);
			side2 = this.getDirection(s1x, s1y, s2x, s2y, t1x, t1y);
			if ( side1 == 1 && side2 <= 0 || side1 <= 0 && side2 == 1 )
			{
				return true;
			}
		}
		
		return false;
	}
	
	private static __circumcenter:DDLSPoint2D = new DDLSPoint2D();
	public static isDelaunay(edge:DDLSEdge):boolean
	{
		var vLeft:DDLSVertex = edge.originVertex;
		var vRight:DDLSVertex = edge.destinationVertex;
		var vCorner:DDLSVertex = edge.nextLeftEdge.destinationVertex;
		var vOpposite:DDLSVertex = edge.nextRightEdge.destinationVertex;
		/*
		// middle points
		var vMidLeft:Point = new Point();
		vMidLeft.x = (vCorner.pos.x + vLeft.pos.x) / 2;
		vMidLeft.y = (vCorner.pos.y + vLeft.pos.y) / 2;
		
		var vMidRight:Point = new Point();
		vMidRight.x = (vCorner.pos.x + vRight.pos.x) / 2;
		vMidRight.y = (vCorner.pos.y + vRight.pos.y) / 2;
		*/
		/*
		- parametric expression of orthogonal segments
		segOrthoLeftX(t1) = vMidLeft.x + t1 * (vLeft.y - vCorner.y)
		segOrthoLeftY(t1) = vMidLeft.y - t1 * (vLeft.x - vCorner.x)
		
		segOrthoRightX(t2) = vMidRight.x + t2 * (vRight.y - vCorner.y)
		segOrthoRightY(t2) = vMidRight.y - t2 * (vRight.x - vCorner.x)
		
		- the center of circle passing by vLeft, vRight, vCorner will lead to:
		segOrthoLeftX(t1) = segOrthoRightX(t2)
		segOrthoLeftY(t1) = segOrthoRightY(t2)
		*/
		/*
		// set alias letters
		var a:number = vMidLeft.x;
		var b:number = vLeft.pos.y;
		var c:number = vCorner.pos.y;
		var d:number = vMidRight.x;
		var e:number = vRight.pos.y;
		var f:number = vCorner.pos.y;
		var g:number = vMidLeft.y;
		var h:number = vLeft.pos.x;
		var i:number = vCorner.pos.x;
		var j:number = vMidRight.y;
		var k:number = vRight.pos.x;
		var l:number = vCorner.pos.x;
		*/
		/*
		system to solve:
		a + t1 (b - c) = d + t2 (e - f)
		g - t1 (h - i) = j - t2 (k - l)
		*/
		
		//giving to wolfram: Solve[{a + t1 (b - c) = d + t2 (e - f) , g - t1 (h - i) = j - t2 (k - l)}, {t1, t2}]
		//we get:
		//var t1:number = (-(a-d)*(k-l) + e*(j-g) + f*(g-j)) / ((b-c)*(k-l) + e*(i-h) + f*(h-i));
		/*
		__barycenter.x = a + t1 * (b - c);
		__barycenter.y = g - t1 * (h - i);
		*/
		this.getCircumcenter(vCorner.pos.x, vCorner.pos.y, vLeft.pos.x, vLeft.pos.y, vRight.pos.x, vRight.pos.y, this.__circumcenter);
		
		// check if the opposite vertex lies outside the circle
		var squaredRadius:number = (vCorner.pos.x - this.__circumcenter.x)*(vCorner.pos.x - this.__circumcenter.x) + (vCorner.pos.y - this.__circumcenter.y)*(vCorner.pos.y - this.__circumcenter.y);
		var squaredDistance:number = (vOpposite.pos.x - this.__circumcenter.x)*(vOpposite.pos.x - this.__circumcenter.x) + (vOpposite.pos.y - this.__circumcenter.y)*(vOpposite.pos.y - this.__circumcenter.y);
		
		return squaredDistance >= squaredRadius;
	}
	
	public static getCircumcenter(x1:number, y1:number, x2:number, y2:number, x3:number, y3:number, result:DDLSPoint2D=null):DDLSPoint2D
	{
		if ( ! result )
		{
			result = new DDLSPoint2D();
		}
		
		// middle points
		var m1:number = (x1 + x2) / 2;
		var m2:number = (y1 + y2) / 2;
		var m3:number = (x1 + x3) / 2;
		var m4:number = (y1 + y3) / 2;
		/*
		- parametric expression of orthogonal segments
		segOrtho1X(t1) = m1 + t1 * (y2 - y1)
		segOrtho1Y(t1) = m2 - t1 * (x2 - x1)
		
		segOrtho2X(t2) = m3 + t2 * (y3 - y1)
		segOrtho2Y(t2) = m4 - t2 * (x3 - x1)
		
		- the center of circle passing by vLeft, vRight, vCorner will lead to:
		segOrtho1X(t1) = segOrtho2X(t2)
		segOrtho1Y(t1) = segOrtho2Y(t2)
		
		system to solve:
		m1 + t1 (y2 - y1) = m3 + t2 (y3 - y1)
		m2 - t1 (x2 - x1) = m4 - t2 (x3 - x1)
		
		giving to wolfram: Solve[{m1 + t1 (y2 - y1) = m3 + t2 (y3 - y1) , m2 - t1 (x2 - x1) = m4 - t2 (x3 - x1)}, {t1, t2}]
		we get:any*/
		var t1:number = (m1*(x1 - x3) + (m2 - m4)*(y1-y3) + m3*(x3 - x1)) / (x1*(y3 - y2) + x2*(y1 - y3) + x3*(y2 - y1));
		
		result.x = m1 + t1 * (y2 - y1);
		result.y = m2 - t1 * (x2 - x1);
		
		return result;
	}
	
	public static intersections2segments(s1p1x:number, s1p1y:number, s1p2x:number, s1p2y:number
												, s2p1x:number, s2p1y:number, s2p2x:number, s2p2y:number
												, posIntersection:DDLSPoint2D=null, paramIntersection:number[]=null
												, infiniteLineMode:boolean=false):boolean
	{
		var t1:number;
		var t2:number;
		
		var result:boolean;
		var divisor:number = (s1p1x - s1p2x)*(s2p1y - s2p2y) + (s1p2y - s1p1y)*(s2p1x - s2p2x);
		if (divisor == 0)
		{
			result = false; // parallel case, no intersection
		}
		else
		{
			result = true;
			
			if ( !infiniteLineMode || posIntersection || paramIntersection )
			{
				// if we consider <finite> edges segments, we must check t1 and t2 values
				t1 = (s1p1x*(s2p1y - s2p2y) + s1p1y*(s2p2x - s2p1x) + s2p1x*s2p2y - s2p1y*s2p2x) / divisor;
				t2 = (s1p1x*(s2p1y - s1p2y) + s1p1y*(s1p2x - s2p1x) - s1p2x*s2p1y + s1p2y*s2p1x) / divisor;
				if (!infiniteLineMode && !(0 <= t1 && t1 <=1 && 0 <= t2 && t2 <=1))
					result = false;
			}
		}
		
		if (result)
		{
			if (posIntersection)
			{
				posIntersection.x = s1p1x + t1*(s1p2x - s1p1x);
				posIntersection.y = s1p1y + t1*(s1p2y - s1p1y);
			}
			if (paramIntersection)
			{
				paramIntersection.push(t1, t2);
			}
		}
		
		return result;
	}
	
	public static intersections2edges(edge1:DDLSEdge, edge2:DDLSEdge
												, posIntersection:DDLSPoint2D=null, paramIntersection:number[]=null
												, infiniteLineMode:boolean=false):boolean
	{
		return this.intersections2segments(  edge1.originVertex.pos.x, edge1.originVertex.pos.y
										, edge1.destinationVertex.pos.x, edge1.destinationVertex.pos.y
										, edge2.originVertex.pos.x, edge2.originVertex.pos.y
										, edge2.destinationVertex.pos.x, edge2.destinationVertex.pos.y
										, posIntersection, paramIntersection, infiniteLineMode);
	}
	
	// a edge is convex if the polygon formed by the 2 faces at left and right of this edge is convex
	public static isConvex(edge:DDLSEdge):boolean
	{
		var result:boolean = true;
		
		var eLeft:DDLSEdge;
		var vRight:DDLSVertex;
		
		eLeft = edge.nextLeftEdge.oppositeEdge;
		vRight = edge.nextRightEdge.destinationVertex;
		if ( this.getRelativePosition(vRight.pos.x, vRight.pos.y, eLeft) != -1 )
		{
			result = false;
		}
		else
		{
			eLeft = edge.prevRightEdge;
			vRight = edge.prevLeftEdge.originVertex;
			if ( this.getRelativePosition(vRight.pos.x, vRight.pos.y, eLeft) != -1 )
			{
				result = false;
			}
		}
			
		return result
	}
	
	public static projectOrthogonaly(vertexPos:DDLSPoint2D, edge:DDLSEdge):void
	{
		// parametric expression of edge
		// x(t1) = edge.originVertex.pos.x + t1*(edge.destinationVertex.pos.x - edge.originVertex.pos.x)
		// y(t1) = edge.originVertex.pos.y + t1*(edge.destinationVertex.pos.y - edge.originVertex.pos.y)
		
		// parametric expression of the segment orthogonal to edge and lying by vertex
		// x(t2) = vertexPos.x + t2*(edge.destinationVertex.pos.y - edge.originVertex.pos.y)
		// y(t2) = vertexPos.y - t2*(edge.destinationVertex.pos.x - edge.originVertex.pos.x)
		
		// the orthogonal projection of vertex on edge will lead to:
		// x(t1) = x(t2)
		// y(t1) = y(t2)
		
		// set alias letters
		var a:number = edge.originVertex.pos.x;
		var b:number = edge.originVertex.pos.y;
		var c:number = edge.destinationVertex.pos.x;
		var d:number = edge.destinationVertex.pos.y;
		var e:number = vertexPos.x;
		var f:number = vertexPos.y;
		
		// system to solve:
		// a + t1 (c - a) = e + t2 (d - b)
		// b + t1 (d - b) = f - t2 (c - a)
		
		// solution:
		var t1:number = (a*a - a*c - a*e + b*b - b*d - b*f + c*e + d*f) / (a*a - 2*a*c + b*b - 2*b*d + c*c + d*d);

		// set position:
		vertexPos.x = a + t1*(c - a);
		vertexPos.y = b + t1*(d - b);
	}
	
	public static projectOrthogonalyOnSegment(px:number, py:number, sp1x:number, sp1y:number, sp2x:number, sp2y:number, result:DDLSPoint2D):void
	{
		// set alias letters
		var a:number = sp1x;
		var b:number = sp1y;
		var c:number = sp2x;
		var d:number = sp2y;
		var e:number = px;
		var f:number = py;
		
		// system to solve:
		// a + t1 (c - a) = e + t2 (d - b)
		// b + t1 (d - b) = f - t2 (c - a)
		
		// solution:
		var t1:number = (a*a - a*c - a*e + b*b - b*d - b*f + c*e + d*f) / (a*a - 2*a*c + b*b - 2*b*d + c*c + d*d);
		
		// set position:
		result.x = a + t1*(c - a);
		result.y = b + t1*(d - b);
	}
	
	// fill the result vector with 4 elements, with the form:
	// [intersect0.x, intersect0.y, intersect1.x, intersect1.y]
	// empty if no intersection
	public static intersections2Circles(cx1:number, cy1:number, r1:number, cx2:number, cy2:number, r2:number, result:number[]=null):boolean
	{
		var distRadiusSQRD:number =  ((cx2 - cx1)*(cx2 - cx1) + (cy2 - cy1)*(cy2 - cy1));
		
		if ( (cx1 != cx2 || cy1 != cy2)
			&& distRadiusSQRD <= ((r1 + r2)*(r1 + r2))
			&& distRadiusSQRD >= ((r1 - r2)*(r1 - r2)) )
		{
			var transcendPart:number = Math.sqrt(  ((r1 + r2)*(r1 + r2) - distRadiusSQRD)
				* (distRadiusSQRD - (r2 - r1)*(r2 - r1))  );
			var xFirstPart:number = (cx1 + cx2) / 2 + (cx2 - cx1)*(r1*r1 - r2*r2) / (2*distRadiusSQRD);
			var yFirstPart:number = (cy1 + cy2) / 2 + (cy2 - cy1)*(r1*r1 - r2*r2) / (2*distRadiusSQRD);
			var xFactor:number = (cy2 - cy1) / (2*distRadiusSQRD);
			var yFactor:number = (cx2 - cx1) / (2*distRadiusSQRD);
			
			if (result)
			{
				result.push(  xFirstPart + xFactor * transcendPart
							, yFirstPart - yFactor * transcendPart
							, xFirstPart - xFactor * transcendPart
							, yFirstPart + yFactor * transcendPart );
			}
			
			return true;
		}
		else
			return false;
	}
	
	public static intersectionsSegmentCircle(p0x:number, p0y:number
													, p1x:number, p1y:number
													, cx:number, cy:number, r:number
													, result:number[]=null):boolean
	{
		
		var p0xSQD:number = p0x*p0x;
		var p0ySQD:number = p0y*p0y;
		var a:number = p1y*p1y - 2*p1y*p0y + p0ySQD + p1x*p1x - 2*p1x*p0x + p0xSQD;
		var b:number = 2*p0y*cy - 2*p0xSQD + 2*p1y*p0y - 2*p0ySQD + 2*p1x*p0x - 2*p1x*cx + 2*p0x*cx - 2*p1y*cy;
		var c:number = p0ySQD + cy*cy + cx*cx - 2*p0y*cy - 2*p0x*cx + p0xSQD - r*r;
		var delta:number = b*b - 4*a*c;
		var deltaSQRT:number;
		
		var t0:number;
		var t1:number;
		if (delta < 0)
		{
			// no solution
			return false;
		}
		else if (delta == 0)
		{
			// unique solution
			t0 = - b / (2 * a);
			if (t0 < 0 || t0 > 1)
				return false;
			// we return a 3 elements array, under the form:
			//  [intersect0.x, intersect0.y, t0]
			if (result)
				result.push( p0x + t0*(p1x - p0x), p0y + t0*(p1y - p0y),  t0 );
			
			return true
		}
		else // (delta > 0)
		{
			deltaSQRT = Math.sqrt(delta);
			t0 = (- b + deltaSQRT) / (2 * a);
			t1 = (- b - deltaSQRT) / (2 * a);
			// we return a n elements array, under the form:
			//  [intersect0.x, intersect0.y, t0
			//	, intersect1.x, intersect1.y, t1]
			var intersecting:boolean = false;
			if (0 <= t0 && t0 <= 1)
			{
				if (result)
					result.push( p0x + t0*(p1x - p0x), p0y + t0*(p1y - p0y), t0 );
				intersecting = true;
			}
			if (0 <= t1 && t1 <= 1)
			{
				if (result)
					result.push( p0x + t1*(p1x - p0x), p0y + t1*(p1y - p0y), t1 );
				intersecting = true;
			}
			
			return intersecting;
		}
	}
	
	public static intersectionsLineCircle(p0x:number, p0y:number
												, p1x:number, p1y:number
												, cx:number, cy:number, r:number
												, result:number[]):boolean
	{
		var p0xSQD:number = p0x*p0x;
		var p0ySQD:number = p0y*p0y;
		var a:number = p1y*p1y - 2*p1y*p0y + p0ySQD + p1x*p1x - 2*p1x*p0x + p0xSQD;
		var b:number = 2*p0y*cy - 2*p0xSQD + 2*p1y*p0y - 2*p0ySQD + 2*p1x*p0x - 2*p1x*cx + 2*p0x*cx - 2*p1y*cy;
		var c:number = p0ySQD + cy*cy + cx*cx - 2*p0y*cy - 2*p0x*cx + p0xSQD - r*r;
		var delta:number = b*b - 4*a*c;
		var deltaSQRT:number;
		
		var t0:number;
		var t1:number;
		if (delta < 0)
		{
			// no solution
			return false;
		}
		else if (delta == 0)
		{
			// unique solution
			t0 = - b / (2 * a);
			// we return a 3 elements array, under the form:
			//  [intersect0.x, intersect0.y, t0]
			result.push( p0x + t0*(p1x - p0x), p0y + t0*(p1y - p0y),  t0 );
		}
		else if (delta > 0)
		{
			deltaSQRT = Math.sqrt(delta);
			t0 = (- b + deltaSQRT) / (2 * a);
			t1 = (- b - deltaSQRT) / (2 * a);
			// we return a 6 elements array, under the form:
			//  [intersect0.x, intersect0.y, t0
			//	, intersect1.x, intersect1.y, t1]
			result.push( p0x + t0*(p1x - p0x), p0y + t0*(p1y - p0y), t0, p0x + t1*(p1x - p0x), p0y + t1*(p1y - p0y), t1 );
		}
		
		return true;
	}
	
	// based on intersections2Circles method
	// fill the result vector with 4 elements, with the form:
	// [point_tangent1.x, point_tangent1.y, point_tangent2.x, point_tangent2.y]
	// empty if no tangent
	public static tangentsPointToCircle(px:number, py:number, cx:number, cy:number, r:number, result:number[]):void
	{
		var c2x:number = (px + cx)/2;
		var c2y:number = (py + cy)/2;
		var r2:number = 0.5*Math.sqrt( (px-cx)*(px-cx) + (py-cy)*(py-cy) );
		
		this.intersections2Circles( c2x, c2y, r2, cx, cy, r, result );
	}
	
	// <!!!> CIRCLES MUST HAVE SAME RADIUS
	public static tangentsCrossCircleToCircle(r:number, c1x:number, c1y:number, c2x:number, c2y:number, result:number[]):boolean
	{
		var distance:number = Math.sqrt( (c1x-c2x)*(c1x-c2x) + (c1y-c2y)*(c1y-c2y) );
		
		// new circle
		var radius:number = distance / 4;
		var centerX:number = c1x + (c2x - c1x)/4;
		var centerY:number = c1y + (c2y - c1y)/4;
		
		if ( this.intersections2Circles(c1x, c1y, r, centerX, centerY, radius, result) )
		{
			var t1x:number = result[0];
			var t1y:number = result[1];
			var t2x:number = result[2];
			var t2y:number = result[3];
			
			var midX:number = (c1x + c2x)/2;
			var midY:number = (c1y + c2y)/2;
			var dotProd:number = (t1x - midX)*(c2y - c1y) + (t1y - midY)*(- c2x + c1x);
			var tproj:number = dotProd / (distance*distance);
			var projx:number = midX + tproj*(c2y - c1y);
			var projy:number = midY - tproj*(c2x - c1x);
			
			
			var t4x:number = 2*projx - t1x;
			var t4y:number = 2*projy - t1y;
			
			var t3x:number = t4x + t2x - t1x;
			var t3y:number = t2y + t4y - t1y;
			
			result.push( t3x, t3y, t4x, t4y );
			
			return true;
		}
		else
		{
			// no tangent because cicles are intersecting
			return false;
		}
	}
	
	// <!!!> CIRCLES MUST HAVE SAME RADIUS
	public static tangentsParalCircleToCircle(r:number, c1x:number, c1y:number, c2x:number, c2y:number, result:number[]):void
	{
		var distance:number = Math.sqrt( (c1x-c2x)*(c1x-c2x) + (c1y-c2y)*(c1y-c2y) );
		var t1x:number = c1x + r * (c2y - c1y) / distance;
		var t1y:number = c1y + r * (- c2x + c1x) / distance;
		var t2x:number = 2*c1x - t1x;
		var t2y:number = 2*c1y - t1y;
		var t3x:number = t2x + c2x - c1x;
		var t3y:number = t2y + c2y - c1y;
		var t4x:number = t1x + c2x - c1x;
		var t4y:number = t1y + c2y - c1y
		result.push( t1x, t1y, t2x, t2y, t3x, t3y, t4x, t4y );
	}
	
	// squared distance from point p to infinite line (a, b)
	public static distanceSquaredPointToLine(px:number, py:number, ax:number, ay:number, bx:number, by:number):number
	{
		var a_b_squaredLength:number = (bx - ax)*(bx - ax) + (by - ay)*(by - ay);
		var dotProduct:number = (px - ax)*(bx - ax) + (py - ay)*(by - ay);
		var p_a_squaredLength:number = (ax - px)*(ax - px) + (ay - py)*(ay - py);
		return p_a_squaredLength - dotProduct * dotProduct / a_b_squaredLength;
	}
	
	// squared distance from point p to finite segment [a, b]
	public static distanceSquaredPointToSegment(px:number, py:number, ax:number, ay:number, bx:number, by:number):number
	{
		var a_b_squaredLength:number = (bx - ax)*(bx - ax) + (by - ay)*(by - ay);
		var dotProduct:number = ((px - ax)*(bx - ax) + (py - ay)*(by - ay)) / a_b_squaredLength;
		if ( dotProduct < 0 )
		{
			return (px - ax)*(px - ax) + (py - ay)*(py - ay);
		}
		else if ( dotProduct <= 1 )
		{
			var p_a_squaredLength:number = (ax - px)*(ax - px) + (ay - py)*(ay - py);
			return p_a_squaredLength - dotProduct * dotProduct * a_b_squaredLength;
		}
		else
		{
			return (px - bx)*(px - bx) + (py - by)*(py - by);
		}
	}
	
	public static distanceSquaredVertexToEdge(vertex:DDLSVertex, edge:DDLSEdge):number
	{
		return this.distanceSquaredPointToSegment( vertex.pos.x, vertex.pos.y
											, edge.originVertex.pos.x, edge.originVertex.pos.y
											, edge.destinationVertex.pos.x, edge.destinationVertex.pos.y );
	}
	
	public static pathLength(path:number[]):number
	{
		var sumDistance:number = 0;
		var fromX:number = path[0];
		var fromY:number = path[1];
		var nextX:number;
		var nextY:number;
		var x:number;
		var y:number;
		var distance:number;
		for (var i:number=2 ; i<path.length ; i+=2)
		{
			nextX = path[i];
			nextY = path[i+1];
			x = nextX - fromX;
			y = nextY - fromY;
			distance = Math.sqrt(x*x + y*y);
			sumDistance += distance;
			fromX = nextX;
			fromY = nextY;
		}
		
		return sumDistance;
	}
	
}
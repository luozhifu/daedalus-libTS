import { DDLSGeom2D } from "../data/math/DDLSGeom2D";
import { DDLSFace } from "../data/DDLSFace";
import { DDLSEdge } from "../data/DDLSEdge";
import { DDLSPoint2D } from "../data/math/DDLSPoint2D";
import { DDLSVertex } from "../data/DDLSVertex";
import { DDLSMesh } from "../data/DDLSMesh";
import { IteratorFromFaceToInnerEdges } from "../iterators/IteratorFromFaceToInnerEdges";


export class DDLSAStar
{
	
	private _mesh:DDLSMesh;
	
	
	private __closedFaces:any;
	private __sortedOpenedFaces:DDLSFace[];
	private __openedFaces:any;
	private __entryEdges:any;
	private __entryX:any;
	private __entryY:any;
	private __scoreF:any;
	private __scoreG:any;
	private __scoreH:any;
	private __predecessor:any;
	
	private __iterEdge:IteratorFromFaceToInnerEdges;
	
	private _radius:number;
	private _radiusSquared:number;
	private _diameter:number;
	private _diameterSquared:number;
	
	constructor()
	{
		this.__iterEdge = new IteratorFromFaceToInnerEdges();
	}
	
	public dispose():void
	{
		this._mesh = null;
		
			this.__closedFaces = null;
		this.__sortedOpenedFaces = null;
		this.__openedFaces = null;
		this.__entryEdges = null;
		this.__entryX = null;
		this.__entryY = null;
		this.__scoreF = null;
		this.__scoreG = null;
		this.__scoreH = null;
		this.__predecessor = null;
	}
	
	public get radius():number
	{
		return this._radius;
	}

	public set radius(value:number)
	{
		this._radius = value;
		this._radiusSquared = this._radius*this._radius;
		this._diameter = this._radius*2;
		this._diameterSquared = this._diameter*this._diameter;
	}

	public set mesh(value:DDLSMesh)
	{
		this._mesh = value;
	}
	
	private __fromFace:DDLSFace;
	private __toFace:DDLSFace;
	private __curFace:DDLSFace;
	public findPath(fromX:number, fromY:number, toX:number, toY:number
							, resultListFaces:DDLSFace[]
							, resultListEdges:DDLSEdge[]):void
	{
		//console.log("findPath");
		this.__closedFaces = {};
		this.__sortedOpenedFaces = [];
		this.__openedFaces = {};
		this.__entryEdges = {};
		this.__entryX = {};
		this.__entryY = {};
		this.__scoreF = {};
		this.__scoreG = {};
		this.__scoreH = {};
		this.__predecessor = {};
		
		var loc:Object;
		var locEdge:DDLSEdge;
		var locVertex:DDLSVertex;
		var distance:number;
		var p1:DDLSPoint2D;
		var p2:DDLSPoint2D;
		var p3:DDLSPoint2D;
		//
		loc = DDLSGeom2D.locatePosition(fromX, fromY, this._mesh);
		locVertex = loc instanceof DDLSVertex?loc:null;
		if ( locVertex )
		{
			// vertex are always in constraint, so we abort
			return;
		}
		else if ( (locEdge = loc instanceof DDLSEdge?loc:null) )
		{
			// if the vertex lies on a constrained edge, we abort
			if (locEdge.isConstrained)
				return;
			
			this.__fromFace = locEdge.leftFace;
		}
		else
		{
			this.__fromFace = loc instanceof DDLSFace?loc:null;
		}
		//
		loc = DDLSGeom2D.locatePosition(toX, toY, this._mesh);
		locVertex = loc instanceof DDLSVertex?loc:null;
		if ( locVertex )
			this.__toFace = locVertex.edge.leftFace;
		else if ( (locEdge = loc instanceof DDLSEdge?loc:null) )
			this.__toFace = locEdge.leftFace;
		else
			this.__toFace = loc instanceof DDLSFace?loc:null;
		
		/*this.__fromFace.colorDebug = 0xFF0000;
		this.__toFace.colorDebug = 0xFF0000;
		console.log( "from face:", this.__fromFace );
		console.log( "to face:", this.__toFace );*/
		
		this.__sortedOpenedFaces.push(this.__fromFace);
		this.__entryEdges[this.__fromFace.id] = null;
		this.__entryX[this.__fromFace.id] = fromX;
		this.__entryY[this.__fromFace.id] = fromY;
		this.__scoreG[this.__fromFace.id] = 0;
		this.__scoreH[this.__fromFace.id] = Math.sqrt((toX - fromX)*(toX - fromX) + (toY - fromY)*(toY - fromY));
		this.__scoreF[this.__fromFace.id] = this.__scoreH[this.__fromFace.id] + this.__scoreG[this.__fromFace.id];
		
		var innerEdge:DDLSEdge;
		var neighbourFace:DDLSFace;
		var f:number;
		var g:number;
		var h:number;
		var fromPoint:DDLSPoint2D = new DDLSPoint2D();
		var entryPoint:DDLSPoint2D = new DDLSPoint2D();
		var distancePoint:DDLSPoint2D = new DDLSPoint2D();
		var fillDatas:boolean;
		while (true)
		{
			// no path found
			if (this.__sortedOpenedFaces.length == 0)
			{
				//console.log("DDLSAStar no path found");
				this.__curFace = null;
				break;
			}
			
			// we reached the target face
			this.__curFace = this.__sortedOpenedFaces.pop();
			if (this.__curFace == this.__toFace)
			{
				break;
			}
			
			// we continue the search
			this.__iterEdge.fromFace = this.__curFace;
			innerEdge = this.__iterEdge.next();
			while ( innerEdge )
			{
				if (innerEdge.isConstrained)
				{
					innerEdge = this.__iterEdge.next();
					continue;
				}
				neighbourFace = innerEdge.rightFace;
				if (! this.__closedFaces[neighbourFace.id] )
				{
					if ( this.__curFace != this.__fromFace && this._radius > 0 && ! this.isWalkableByRadius(this.__entryEdges[this.__curFace.id], this.__curFace, innerEdge))
					{
//							console.log("- NOT WALKABLE -");
//							console.log( "from", DDLSEdge(this.__entryEdges[this.__curFace]).originVertex.id, DDLSEdge(this.__entryEdges[this.__curFace]).destinationVertex.id );
//							console.log( "to", innerEdge.originVertex.id, innerEdge.destinationVertex.id );
//							console.log("----------------");
						innerEdge = this.__iterEdge.next();
						continue;
					}
					
					fromPoint.x = this.__entryX[this.__curFace.id];
					fromPoint.y = this.__entryY[this.__curFace.id];
					entryPoint.x = (innerEdge.originVertex.pos.x + innerEdge.destinationVertex.pos.x) /2;
					entryPoint.y = (innerEdge.originVertex.pos.y + innerEdge.destinationVertex.pos.y) /2;
					distancePoint.x = entryPoint.x - toX;
					distancePoint.y = entryPoint.y - toY;
					h = distancePoint.length;
					distancePoint.x = fromPoint.x - entryPoint.x;
					distancePoint.y = fromPoint.y - entryPoint.y;
					g = this.__scoreG[this.__curFace.id] + distancePoint.length;
					f = h + g;
					fillDatas = false;
					if (! this.__openedFaces[neighbourFace.id]  )
					{
						this.__sortedOpenedFaces.push(neighbourFace);
						this.__openedFaces[neighbourFace.id] = true;
						fillDatas = true;
					}
					else if ( this.__scoreF[neighbourFace.id] > f )
					{
						fillDatas = true;
					}
					if (fillDatas)
					{
						this.__entryEdges[neighbourFace.id] = innerEdge;
						this.__entryX[neighbourFace.id] = entryPoint.x;
						this.__entryY[neighbourFace.id] = entryPoint.y;
						this.__scoreF[neighbourFace.id] = f;
						this.__scoreG[neighbourFace.id] = g;
						this.__scoreH[neighbourFace.id] = h;
						this.__predecessor[neighbourFace.id] = this.__curFace;
					}
				}
				innerEdge = this.__iterEdge.next();
			}
			//
			this.__openedFaces[this.__curFace.id] = null;
			this.__closedFaces[this.__curFace.id] = true;
			this.__sortedOpenedFaces.sort(// faces with low distance value are at the end of the array
				(a:DDLSFace, b:DDLSFace):number =>
				{
					if (this.__scoreF[a.id] == this.__scoreF[b.id])
						return 0;
					else if (this.__scoreF[a.id] < this.__scoreF[b.id])
						return 1;
					else
						return -1;
				});
		}
		
		// if we didn't find a path
		if (! this.__curFace)
			return;
		
		// else we build the path
		resultListFaces.push(this.__curFace);
		//this.__curFace.colorDebug = 0x0000FF;
		while (this.__curFace != this.__fromFace)
		{
			resultListEdges.unshift(this.__entryEdges[this.__curFace.id]);
			//this.__entryEdges[this.__curFace].colorDebug = 0xFFFF00;
			//this.__entryEdges[this.__curFace].oppositeEdge.colorDebug = 0xFFFF00;
			this.__curFace = this.__predecessor[this.__curFace.id];
			//this.__curFace.colorDebug = 0x0000FF;
			resultListFaces.unshift(this.__curFace);
		}
	}
	
	private isWalkableByRadius(fromEdge:DDLSEdge, throughFace:DDLSFace, toEdge:DDLSEdge):boolean
	{
		var vA:DDLSVertex; // the vertex on fromEdge not on toEdge
		var vB:DDLSVertex; // the vertex on toEdge not on fromEdge
		var vC:DDLSVertex; // the common vertex of the 2 edges (pivot)
		
		// we identify the points
		if ( fromEdge.originVertex == toEdge.originVertex )
		{
			vA = fromEdge.destinationVertex;
			vB = toEdge.destinationVertex;
			vC = fromEdge.originVertex;
		}
		else if (fromEdge.destinationVertex == toEdge.destinationVertex)
		{
			vA = fromEdge.originVertex;
			vB = toEdge.originVertex;
			vC = fromEdge.destinationVertex;
		}
		else if (fromEdge.originVertex == toEdge.destinationVertex)
		{
			vA = fromEdge.destinationVertex;
			vB = toEdge.originVertex;
			vC = fromEdge.originVertex;
		}
		else if (fromEdge.destinationVertex == toEdge.originVertex)
		{
			vA = fromEdge.originVertex;
			vB = toEdge.destinationVertex;
			vC = fromEdge.destinationVertex;
		}
		
		var dot:number;
		var result:boolean;
		var distSquared:number;
		
		// if we have a right or obtuse angle on CAB
		dot = (vC.pos.x - vA.pos.x)*(vB.pos.x - vA.pos.x) + (vC.pos.y - vA.pos.y)*(vB.pos.y - vA.pos.y);
		if (dot <= 0)
		{
			// we compare length of AC with this.radius
			distSquared = (vC.pos.x - vA.pos.x)*(vC.pos.x - vA.pos.x) + (vC.pos.y - vA.pos.y)*(vC.pos.y - vA.pos.y);
			if (distSquared >= this._diameterSquared)
				return true;
			else
				return false;
		}
		
		// if we have a right or obtuse angle on CBA
		dot = (vC.pos.x - vB.pos.x)*(vA.pos.x - vB.pos.x) + (vC.pos.y - vB.pos.y)*(vA.pos.y - vB.pos.y);
		if (dot <= 0)
		{
			// we compare length of BC with this.radius
			distSquared = (vC.pos.x - vB.pos.x)*(vC.pos.x - vB.pos.x) + (vC.pos.y - vB.pos.y)*(vC.pos.y - vB.pos.y);
			if (distSquared >= this._diameterSquared)
				return true;
			else
				return false;
		}
		
		// we identify the adjacent edge (facing pivot vertex)
		var adjEdge:DDLSEdge;
		if (throughFace.edge != fromEdge && throughFace.edge.oppositeEdge != fromEdge
			&& throughFace.edge != toEdge && throughFace.edge.oppositeEdge != toEdge)
			adjEdge = throughFace.edge;
		else if (throughFace.edge.nextLeftEdge != fromEdge && throughFace.edge.nextLeftEdge.oppositeEdge != fromEdge
				&& throughFace.edge.nextLeftEdge != toEdge && throughFace.edge.nextLeftEdge.oppositeEdge != toEdge)
			adjEdge = throughFace.edge.nextLeftEdge;
		else
			adjEdge = throughFace.edge.prevLeftEdge;
		
		// if the adjacent edge is constrained, we check the distance of orthognaly projected
		if (adjEdge.isConstrained)
		{
			var proj:DDLSPoint2D = new DDLSPoint2D(vC.pos.x, vC.pos.y);
			DDLSGeom2D.projectOrthogonaly(proj, adjEdge);
			distSquared = (proj.x - vC.pos.x)*(proj.x - vC.pos.x) + (proj.y - vC.pos.y)*(proj.y - vC.pos.y);
			if (distSquared >= this._diameterSquared)
				return true;
			else
				return false;
		}
		else // if the adjacent is not constrained
		{
			var distSquaredA:number = (vC.pos.x - vA.pos.x)*(vC.pos.x - vA.pos.x) + (vC.pos.y - vA.pos.y)*(vC.pos.y - vA.pos.y);
			var distSquaredB:number = (vC.pos.x - vB.pos.x)*(vC.pos.x - vB.pos.x) + (vC.pos.y - vB.pos.y)*(vC.pos.y - vB.pos.y);
			if (distSquaredA < this._diameterSquared || distSquaredB < this._diameterSquared)
			{
				return false;
			}
			else
			{
				var vFaceToCheck:DDLSFace[] = [];
				var vFaceIsFromEdge:DDLSEdge[] = [];
				var facesDone:any = {};
				vFaceIsFromEdge.push(adjEdge);
				if (adjEdge.leftFace == throughFace)
				{
					vFaceToCheck.push(adjEdge.rightFace);
					facesDone[adjEdge.rightFace.id] = true;
				}
				else
				{
					vFaceToCheck.push(adjEdge.leftFace);
					facesDone[adjEdge.leftFace.id] = true;
				}
				
				var currFace:DDLSFace;
				var faceFromEdge:DDLSEdge;
				var currEdgeA:DDLSEdge;
				var nextFaceA:DDLSFace;
				var currEdgeB:DDLSEdge;
				var nextFaceB:DDLSFace;
				while (vFaceToCheck.length > 0)
				{
					currFace = vFaceToCheck.shift();
					faceFromEdge = vFaceIsFromEdge.shift();
					
					// we identify the 2 edges to evaluate
					if (currFace.edge == faceFromEdge || currFace.edge == faceFromEdge.oppositeEdge)
					{
						currEdgeA = currFace.edge.nextLeftEdge;
						currEdgeB = currFace.edge.nextLeftEdge.nextLeftEdge;
					}
					else if (currFace.edge.nextLeftEdge == faceFromEdge || currFace.edge.nextLeftEdge == faceFromEdge.oppositeEdge)
					{
						currEdgeA = currFace.edge;
						currEdgeB = currFace.edge.nextLeftEdge.nextLeftEdge;
					}
					else
					{
						currEdgeA = currFace.edge;
						currEdgeB = currFace.edge.nextLeftEdge;
					}
					
					// we identify the faces related to the 2 edges
					if (currEdgeA.leftFace == currFace)
						nextFaceA = currEdgeA.rightFace;
					else
						nextFaceA = currEdgeA.leftFace;
					if (currEdgeB.leftFace == currFace)
						nextFaceB = currEdgeB.rightFace;
					else
						nextFaceB = currEdgeB.leftFace;
						
					// we check if the next face is not already in pipe
					// and if the edge A is close to pivot vertex
					if ( ! facesDone[nextFaceA.id] && DDLSGeom2D.distanceSquaredVertexToEdge(vC, currEdgeA) < this._diameterSquared )
					{
						// if the edge is constrained
						if ( currEdgeA.isConstrained )
						{
							// so it is not walkable
							return false;
						}
						else
						{
							// if the edge is not constrained, we continue the search
							vFaceToCheck.push(nextFaceA);
							vFaceIsFromEdge.push(currEdgeA);
							facesDone[nextFaceA.id] = true;
						}
					}
					
					// we check if the next face is not already in pipe
					// and if the edge B is close to pivot vertex
					if ( ! facesDone[nextFaceB.id] && DDLSGeom2D.distanceSquaredVertexToEdge(vC, currEdgeB) < this._diameterSquared )
					{
						// if the edge is constrained
						if ( currEdgeB.isConstrained )
						{
							// so it is not walkable
							return false;
						}
						else
						{
							// if the edge is not constrained, we continue the search
							vFaceToCheck.push(nextFaceB);
							vFaceIsFromEdge.push(currEdgeB);
							facesDone[nextFaceB.id] = true;
						}
					}
				}
				
				// if we didn't previously meet a constrained edge
				return true;
			}
		}
		
		return true;
	}
	
	
}
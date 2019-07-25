import { DDLSVertex } from "./DDLSVertex";
import { DDLSConstraintShape } from "./DDLSConstraintShape";
import { DDLSEdge } from "./DDLSEdge";
import { DDLSFace } from "./DDLSFace";
import { DDLSPoint2D } from "./math/DDLSPoint2D";
import {DDLSObject} from "./DDLSObject";
import {DDLSConstraintSegment} from "./DDLSConstraintSegment";
import {DDLSMatrix2D} from "./math/DDLSMatrix2D";
import {IteratorFromVertexToOutgoingEdges} from "../iterators/IteratorFromVertexToOutgoingEdges";
import { DDLSGeom2D } from "./math/DDLSGeom2D";
import { DDLSConstants } from "./DDLSConstants";

export class DDLSMesh
{
    
    private static INC:number = 0;
    private _id:number;
    
    private _width:number;
    private _height:number;
    private _clipping:boolean;
    
    private _vertices:DDLSVertex[];
    private _edges:EdgeMap;
    private _faces:FaceMap;
    private _constraintShapes:DDLSConstraintShape[];
    private _objects:DDLSObject[];
    
    // keep references of center vertex and bounding edges when split, useful to restore <Delaunay> edges
    private __centerVertex:DDLSVertex;
    private __edgesToCheck:DDLSEdge[];
    
    constructor(width:number, height:number)
    {
        this._id = DDLSMesh.INC;
        DDLSMesh.INC++;
        
        this._width = width;
        this._height = height;
        this._clipping = true;
        
        this._vertices = [];
        this._edges = new EdgeMap();
        this._faces = new FaceMap();
        this._constraintShapes = [];
        this._objects = [];
        
        this.__edgesToCheck = [];
    }

    public get height():number
    {
        return this._height;
    }

    public get width():number
    {
        return this._width;
    }
    
    public get clipping():boolean
    {
        return this._clipping;
    }
    
    public set clipping(value:boolean)
    {
        this._clipping = value;
    }

    public get id():number
    {
        return this._id;
    }
    
    public dispose():void
    {
        while ( this._vertices.length > 0 )
            this._vertices.pop().dispose();
        this._vertices = null;
        
        this._edges.dispose();
        this._edges = null;
        this._faces.dispose();
        this._faces = null;
        while ( this._constraintShapes.length > 0 )
            this._constraintShapes.pop().dispose();
        this._constraintShapes = null;
        while ( this._objects.length > 0 )
            this._objects.pop().dispose();
        this._objects = null;
        
        this.__edgesToCheck = null;
        this.__centerVertex = null;
    }
    
    public get __vertices():DDLSVertex[]
    {
        return this._vertices;
    }

    public get __edges():DDLSEdge[]
    {
        return this._edges.vector;
    }

    public get __faces():DDLSFace[]
    {
        return this._faces.vector;
    }
    
    public get __constraintShapes():DDLSConstraintShape[]
    {
        return this._constraintShapes;
    }
    
    public buildFromRecord(rec:string):void
    {
        var positions:any[] = rec.split(';');
        for (var i:number = 0; i < positions.length; i+=4) 
        {
            this.insertConstraintSegment(Number(positions[i]), Number(positions[i+1]), Number(positions[i+2]),Number(positions[i+3]));
        }
    }
    
    public insertObject(object:DDLSObject):void
    {
        if (object.constraintShape)
            this.deleteObject(object);
            
        var shape:DDLSConstraintShape = new DDLSConstraintShape();
        var segment:DDLSConstraintSegment;
        var coordinates:number[] = object.coordinates;
        var m:DDLSMatrix2D = object.matrix;
        
        object.updateMatrixFromValues();
        var x1:number;
        var y1:number;
        var x2:number;
        var y2:number;
        var transfx1:number;
        var transfy1:number;
        var transfx2:number;
        var transfy2:number;
        
        for (var i:number=0 ; i<coordinates.length ; i+=4)
        {
            x1 = coordinates[i];
            y1 = coordinates[i+1];
            x2 = coordinates[i+2];
            y2 = coordinates[i+3];
            transfx1 = m.transformX(x1, y1);
            transfy1 = m.transformY(x1, y1);
            transfx2 = m.transformX(x2, y2);
            transfy2 = m.transformY(x2, y2);
            
            segment = this.insertConstraintSegment(transfx1, transfy1, transfx2, transfy2);
            if (segment)
            {
                segment.fromShape = shape;
                shape.segments.push(segment);
            }
        }
        
        this._constraintShapes.push( shape );
        object.constraintShape = shape;
        
        if (!this.__objectsUpdateInProgress)
        {
            this._objects.push(object);
        }
    }
    
    public deleteObject(object:DDLSObject):void
    {
        if (!object.constraintShape)
            return;
        
        this.deleteConstraintShape(object.constraintShape);
        object.constraintShape = null;
        
        if (!this.__objectsUpdateInProgress)
        {
            var index:number = this._objects.indexOf(object);
            this._objects.splice(index, 1);
        }
    }
    
    private __objectsUpdateInProgress:boolean;
    public updateObjects():void
    {
        this.__objectsUpdateInProgress = true;
        for ( var i:number=0 ; i<this._objects.length ; i++ )
        {
            if (this._objects[i].hasChanged)
            {
                this.deleteObject(this._objects[i]);
                this.insertObject(this._objects[i]);
                this._objects[i].hasChanged = false;
            }
        }
        this.__objectsUpdateInProgress = false;
    }
    
    // insert a new collection of constrained edges.
    // Coordinates parameter is a list with form [x0, y0, x1, y1, x2, y2, x3, y3, x4, y4, ....]
    // where each 4-uple sequence (xi, yi, xi+1, yi+1) is a constraint segment (with i % 4 == 0)
    // and where each couple sequence (xi, yi) is a point.
    // Segments are not necessary connected.
    // Segments can overlap (then they will be automaticaly subdivided).
    public insertConstraintShape(coordinates:number[]):DDLSConstraintShape
    {
        var shape:DDLSConstraintShape = new DDLSConstraintShape();
        var segment:DDLSConstraintSegment;
        
        for (var i:number=0 ; i<coordinates.length ; i+=4)
        {
            segment = this.insertConstraintSegment(coordinates[i], coordinates[i+1], coordinates[i+2], coordinates[i+3]);
            if (segment)
            {
                segment.fromShape = shape;
                shape.segments.push(segment);
            }
        }
        
        this._constraintShapes.push( shape );
        
        return shape;
    }
    
    public deleteConstraintShape(shape:DDLSConstraintShape):void
    {
        if(shape.segments)
        {
            for (var i:number=0 ; i<shape.segments.length ; i++)
            {
                this.deleteConstraintSegment( shape.segments[i] );
            }
        }
        
        shape.dispose();
        
        this._constraintShapes.splice(this._constraintShapes.indexOf(shape), 1);
    }
    
    public insertConstraintSegment(x1:number, y1:number, x2:number, y2:number):DDLSConstraintSegment
    {
        // we clip against AABB
        var newX1:number = x1;
        var newY1:number = y1;
        var newX2:number = x2;
        var newY2:number = y2;
        
        if (   (x1 > this._width && x2 > this._width)
            || (x1 < 0 && x2 < 0)
            || (y1 > this._height && y2 > this._height)
            || (y1 < 0 && y2 < 0)  )
        {
            return null;
        }
        else
        {
            var nx:number = x2 - x1;
            var ny:number = y2 - y1;
            
            var tmin:number = Number.NEGATIVE_INFINITY;
            var tmax:number = Number.POSITIVE_INFINITY;
            
            if (nx != 0.0)
            {
                var tx1:number = (0 - x1)/nx;
                var tx2:number = (this._width - x1)/nx;
                
                tmin = Math.max(tmin, Math.min(tx1, tx2));
                tmax = Math.min(tmax, Math.max(tx1, tx2));
            }
            
            if (ny != 0.0)
            {
                var ty1:number = (0 - y1)/ny;
                var ty2:number = (this._height - y1)/ny;
                
                tmin = Math.max(tmin, Math.min(ty1, ty2));
                tmax = Math.min(tmax, Math.max(ty1, ty2));
            }
            
            if (tmax >= tmin)
            {
                
                if (tmax < 1)
                {
                    //Clip end point
                    newX2 = nx*tmax + x1;
                    newY2 = ny*tmax + y1;
                }
                
                if (tmin > 0)
                {
                    //Clip start point
                    newX1 = nx*tmin + x1;
                    newY1 = ny*tmin + y1;
                }
            }
            else
                return null;
        }
        
        // we this.check the vertices insertions
        var vertexDown:DDLSVertex = this.insertVertex(newX1, newY1);
        if (! vertexDown)
            return null;
        var vertexUp:DDLSVertex = this.insertVertex(newX2, newY2);
        if (! vertexUp)
            return null;
        if (vertexDown == vertexUp)
            return null;
        
        //console.log("vertices", vertexDown.id, vertexUp.id)
        
        // useful
        var iterVertexToOutEdges:IteratorFromVertexToOutgoingEdges = new IteratorFromVertexToOutgoingEdges();
        var currVertex:DDLSVertex;
        var currEdge:DDLSEdge;
        var i:number;
        
        // the new constraint segment
        var segment:DDLSConstraintSegment = new DDLSConstraintSegment();
        
        var tempEdgeDownUp:DDLSEdge = new DDLSEdge();
        var tempSdgeUpDown:DDLSEdge = new DDLSEdge();
        tempEdgeDownUp.setDatas(vertexDown, tempSdgeUpDown, null, null, true, true);
        tempSdgeUpDown.setDatas(vertexUp, tempEdgeDownUp, null, null, true, true);
        
        var intersectedEdges:DDLSEdge[] = [];
        var leftBoundingEdges:DDLSEdge[] = [];
        var rightBoundingEdges:DDLSEdge[] = [];
        
        var currObjet:Object;
        var pIntersect:DDLSPoint2D = new DDLSPoint2D();
        var edgeLeft:DDLSEdge;
        var newEdgeDownUp:DDLSEdge;
        var newEdgeUpDown:DDLSEdge;
        var done:boolean;
        currVertex = vertexDown;
        currObjet = currVertex;
        while ( true )
        {
            done = false;
            currVertex = <DDLSVertex> currObjet;
            if ( currVertex instanceof DDLSVertex)
            {
                //console.log("case vertex");
                iterVertexToOutEdges.fromVertex = currVertex;
                while ( currEdge = iterVertexToOutEdges.next() )
                {
                    // if we meet directly the end vertex
                    if ( currEdge.destinationVertex == vertexUp )
                    {
                        //console.log("we met the end vertex");
                        if ( ! currEdge.isConstrained )
                        {
                            currEdge.isConstrained = true;
                            currEdge.oppositeEdge.isConstrained = true;
                        }
                        currEdge.addFromConstraintSegment(segment);
                        currEdge.oppositeEdge.fromConstraintSegments = currEdge.fromConstraintSegments;
                        vertexDown.addFromConstraintSegment(segment);
                        vertexUp.addFromConstraintSegment(segment);
                        segment.addEdge(currEdge);
                        return segment;
                    }
                    // if we meet a vertex
                    if ( DDLSGeom2D.distanceSquaredVertexToEdge(currEdge.destinationVertex, tempEdgeDownUp) <= DDLSConstants.EPSILON_SQUARED )
                    {
                        //console.log("we met a vertex");
                        if ( ! currEdge.isConstrained )
                        {
                            //console.log("edge is not constrained");
                            currEdge.isConstrained = true;
                            currEdge.oppositeEdge.isConstrained = true;
                        }
                        currEdge.addFromConstraintSegment(segment);
                        currEdge.oppositeEdge.fromConstraintSegments = currEdge.fromConstraintSegments;
                        vertexDown.addFromConstraintSegment(segment);
                        segment.addEdge(currEdge);
                        vertexDown = currEdge.destinationVertex;
                        tempEdgeDownUp.originVertex = vertexDown;
                        currObjet = vertexDown;
                        done = true;
                        break;
                    }
                }
                
                if (done)
                    continue;
                
                iterVertexToOutEdges.fromVertex = currVertex;
                currEdge = iterVertexToOutEdges.next();
                while ( currEdge )
                {
                    currEdge = currEdge.nextLeftEdge;
                    if ( DDLSGeom2D.intersections2edges(currEdge, tempEdgeDownUp, pIntersect) )
                    {
                        //console.log("edge intersection");
                        if ( currEdge.isConstrained )
                        {
                            //console.log("edge is constrained");
                            vertexDown = this.splitEdge(currEdge, pIntersect.x, pIntersect.y);
                            iterVertexToOutEdges.fromVertex = currVertex;
                            currEdge = iterVertexToOutEdges.next();
                            while ( currEdge )
                            {
                                if (currEdge.destinationVertex == vertexDown)
                                {
                                    currEdge.isConstrained = true;
                                    currEdge.oppositeEdge.isConstrained = true;
                                    currEdge.addFromConstraintSegment(segment);
                                    currEdge.oppositeEdge.fromConstraintSegments = currEdge.fromConstraintSegments;
                                    segment.addEdge(currEdge);
                                    break;
                                }
                                currEdge = iterVertexToOutEdges.next();
                            }
                            currVertex.addFromConstraintSegment(segment);
                            tempEdgeDownUp.originVertex = vertexDown;
                            currObjet = vertexDown;
                        }
                        else
                        {
                            //console.log("edge is not constrained");
                            intersectedEdges.push(currEdge);
                            leftBoundingEdges.unshift(currEdge.nextLeftEdge);
                            rightBoundingEdges.push(currEdge.prevLeftEdge);
                            currEdge = currEdge.oppositeEdge; // we keep the edge from left to right
                            currObjet = currEdge;
                        }
                        break;
                    }
                    currEdge = iterVertexToOutEdges.next();
                }
            }
            else if (currObjet instanceof DDLSEdge && (currEdge = <DDLSEdge> currObjet))
            {
                //console.log("case edge");
                edgeLeft = currEdge.nextLeftEdge;
                if ( edgeLeft.destinationVertex == vertexUp )
                {
                    //console.log("end point reached");
                    leftBoundingEdges.unshift(edgeLeft.nextLeftEdge);
                    rightBoundingEdges.push(edgeLeft);
                    
                    newEdgeDownUp = new DDLSEdge();
                    newEdgeUpDown = new DDLSEdge();
                    newEdgeDownUp.setDatas(vertexDown, newEdgeUpDown, null, null, true, true);
                    newEdgeUpDown.setDatas(vertexUp, newEdgeDownUp, null, null, true, true);
                    leftBoundingEdges.push(newEdgeDownUp);
                    rightBoundingEdges.push(newEdgeUpDown);
                    this.insertNewConstrainedEdge(segment, newEdgeDownUp, intersectedEdges, leftBoundingEdges, rightBoundingEdges);
                    
                    return segment;
                }
                else if ( DDLSGeom2D.distanceSquaredVertexToEdge( edgeLeft.destinationVertex, tempEdgeDownUp) <= DDLSConstants.EPSILON_SQUARED )
                {
                    //console.log("we met a vertex");
                    leftBoundingEdges.unshift(edgeLeft.nextLeftEdge);
                    rightBoundingEdges.push(edgeLeft);
                    
                    newEdgeDownUp = new DDLSEdge();
                    newEdgeUpDown = new DDLSEdge();
                    newEdgeDownUp.setDatas(vertexDown, newEdgeUpDown, null, null, true, true);
                    newEdgeUpDown.setDatas(edgeLeft.destinationVertex, newEdgeDownUp, null, null, true, true);
                    leftBoundingEdges.push(newEdgeDownUp);
                    rightBoundingEdges.push(newEdgeUpDown);
                    this.insertNewConstrainedEdge(segment, newEdgeDownUp, intersectedEdges, leftBoundingEdges, rightBoundingEdges);
                    
                    intersectedEdges.splice(0, intersectedEdges.length);
                    leftBoundingEdges.splice(0, leftBoundingEdges.length);
                    rightBoundingEdges.splice(0, rightBoundingEdges.length);
                    
                    vertexDown = edgeLeft.destinationVertex;
                    tempEdgeDownUp.originVertex = vertexDown;
                    currObjet = vertexDown;
                }
                else
                {
                    if ( DDLSGeom2D.intersections2edges(edgeLeft, tempEdgeDownUp, pIntersect) )
                    {
                        //console.log("1st left edge intersected");
                        if (edgeLeft.isConstrained)
                        {
                            //console.log("edge is constrained");
                            currVertex = this.splitEdge(edgeLeft, pIntersect.x, pIntersect.y);
                            
                            iterVertexToOutEdges.fromVertex = currVertex;
                            currEdge = iterVertexToOutEdges.next();
                            while ( currEdge )
                            {
                                if (currEdge.destinationVertex == leftBoundingEdges[0].originVertex)
                                {
                                    leftBoundingEdges.unshift(currEdge);
                                }
                                if (currEdge.destinationVertex == rightBoundingEdges[rightBoundingEdges.length-1].destinationVertex)
                                {
                                    rightBoundingEdges.push(currEdge.oppositeEdge);
                                }
                                currEdge = iterVertexToOutEdges.next();
                            }
                            
                            newEdgeDownUp = new DDLSEdge();
                            newEdgeUpDown = new DDLSEdge();
                            newEdgeDownUp.setDatas(vertexDown, newEdgeUpDown, null, null, true, true);
                            newEdgeUpDown.setDatas(currVertex, newEdgeDownUp, null, null, true, true);
                            leftBoundingEdges.push(newEdgeDownUp);
                            rightBoundingEdges.push(newEdgeUpDown);
                            this.insertNewConstrainedEdge(segment, newEdgeDownUp, intersectedEdges, leftBoundingEdges, rightBoundingEdges);
                            
                            intersectedEdges.splice(0, intersectedEdges.length);
                            leftBoundingEdges.splice(0, leftBoundingEdges.length);
                            rightBoundingEdges.splice(0, rightBoundingEdges.length);
                            vertexDown = currVertex;
                            tempEdgeDownUp.originVertex = vertexDown;
                            currObjet = vertexDown;
                        }
                        else
                        {
                            //console.log("edge is not constrained");
                            intersectedEdges.push(edgeLeft);
                            leftBoundingEdges.unshift(edgeLeft.nextLeftEdge);
                            currEdge = edgeLeft.oppositeEdge; // we keep the edge from left to right
                            currObjet = currEdge;
                        }
                    }
                    else
                    {
                        //console.log("2nd left edge intersected");
                        edgeLeft = edgeLeft.nextLeftEdge;
                        DDLSGeom2D.intersections2edges(edgeLeft, tempEdgeDownUp, pIntersect);
                        if (edgeLeft.isConstrained)
                        {
                            //console.log("edge is constrained");
                            currVertex = this.splitEdge(edgeLeft, pIntersect.x, pIntersect.y);
                            
                            iterVertexToOutEdges.fromVertex = currVertex;
                            currEdge = iterVertexToOutEdges.next();
                            while ( currEdge )
                            {
                                if (currEdge.destinationVertex == leftBoundingEdges[0].originVertex)
                                {
                                    leftBoundingEdges.unshift(currEdge);
                                }
                                if (currEdge.destinationVertex == rightBoundingEdges[rightBoundingEdges.length-1].destinationVertex)
                                {
                                    rightBoundingEdges.push(currEdge.oppositeEdge);
                                }
                                currEdge = iterVertexToOutEdges.next();
                            }
                            
                            newEdgeDownUp = new DDLSEdge();
                            newEdgeUpDown = new DDLSEdge();
                            newEdgeDownUp.setDatas(vertexDown, newEdgeUpDown, null, null, true, true);
                            newEdgeUpDown.setDatas(currVertex, newEdgeDownUp, null, null, true, true);
                            leftBoundingEdges.push(newEdgeDownUp);
                            rightBoundingEdges.push(newEdgeUpDown);
                            this.insertNewConstrainedEdge(segment, newEdgeDownUp, intersectedEdges, leftBoundingEdges, rightBoundingEdges);
                            
                            intersectedEdges.splice(0, intersectedEdges.length);
                            leftBoundingEdges.splice(0, leftBoundingEdges.length);
                            rightBoundingEdges.splice(0, rightBoundingEdges.length);
                            vertexDown = currVertex;
                            tempEdgeDownUp.originVertex = vertexDown;
                            currObjet = vertexDown;
                        }
                        else
                        {
                            //console.log("edge is not constrained");
                            intersectedEdges.push(edgeLeft);
                            rightBoundingEdges.push(edgeLeft.prevLeftEdge);
                            currEdge = edgeLeft.oppositeEdge; // we keep the edge from left to right
                            currObjet = currEdge;
                        }
                    }
                }
            }
        }
        
        // return segment;
    }
    
    private insertNewConstrainedEdge(fromSegment:DDLSConstraintSegment, edgeDownUp:DDLSEdge, intersectedEdges:DDLSEdge[], leftBoundingEdges:DDLSEdge[], rightBoundingEdges:DDLSEdge[]):void
    {
        //console.log("insertNewConstrainedEdge");
        this._edges.push(edgeDownUp);
        this._edges.push(edgeDownUp.oppositeEdge);
        
        edgeDownUp.addFromConstraintSegment(fromSegment);
        edgeDownUp.oppositeEdge.fromConstraintSegments = edgeDownUp.fromConstraintSegments;
        
        fromSegment.addEdge(edgeDownUp);
        
        edgeDownUp.originVertex.addFromConstraintSegment(fromSegment);
        edgeDownUp.destinationVertex.addFromConstraintSegment(fromSegment);
        
        this.untriangulate(intersectedEdges);
        
        this.triangulate(leftBoundingEdges, true);
        this.triangulate(rightBoundingEdges, true);
    }
    
    public deleteConstraintSegment(segment:DDLSConstraintSegment):void
    {
        //console.log("this.deleteConstraintSegment this.id", segment.id);
        var i:number;
        var vertexToDelete:DDLSVertex[] = [];
        var edge:DDLSEdge;
        var vertex:DDLSVertex;
        var fromConstraintSegment:DDLSConstraintSegment[];
        for (i=0 ; i<segment.edges.length ; i++)
        {
            edge = segment.edges[i];
            //console.log("unconstrain edge ", edge);
            edge.removeFromConstraintSegment(segment);
            if (edge.fromConstraintSegments.length == 0)
            {
                edge.isConstrained = false;
                edge.oppositeEdge.isConstrained = false;
            }
            
            vertex = edge.originVertex;
            vertex.removeFromConstraintSegment(segment);
            vertexToDelete.push(vertex);
        }
        vertex = edge.destinationVertex;
        vertex.removeFromConstraintSegment(segment);
        vertexToDelete.push(vertex);
        
        //console.log("clean the useless vertices");
        for (i=0 ; i<vertexToDelete.length ; i++)
        {
            this.deleteVertex(vertexToDelete[i]);
        }
        //console.log("clean done");
        
        
        segment.dispose();
    }
    
    private check():void
    {
        for (var i:number = 0; i < this.__edges.length; i++) 
        {
            if (! this.__edges[i].nextLeftEdge)
            {
                console.log("!!! missing nextLeftEdge");
                return;
            }
        }
        console.log("this.check OK");
        
    }
    
    public insertVertex(x:number, y:number):DDLSVertex
    {
        //console.log("insertVertex", x, y);
        if (x<0 || y<0 || x > this._width || y > this._height)
            return null;
        
        this.__edgesToCheck.splice(0, this.__edgesToCheck.length);
        
        var inObject:Object = DDLSGeom2D.locatePosition(x, y, this);
        var inVertex:DDLSVertex;
        var inEdge:DDLSEdge;
        var inFace:DDLSFace;
        var newVertex:DDLSVertex;
        if(inObject instanceof DDLSVertex)
            inVertex = inObject;

        if (inVertex)
        {
            //console.log("inVertex", inVertex.id);
            newVertex = inVertex;
        }
        else if ((inEdge = inObject instanceof DDLSEdge?<DDLSEdge> inObject:null))
        {
            //console.log("inEdge", inEdge);
            newVertex = this.splitEdge(inEdge, x, y);
        }
        else if ((inFace = inObject instanceof DDLSFace?<DDLSFace> inObject:null))
        {
            //console.log("inFace");
            newVertex = this.splitFace(inFace, x, y);
        }
        
        this.restoreAsDelaunay();
        
        return newVertex;
    }
    
    public flipEdge(edge:DDLSEdge):DDLSEdge
    {
        // retrieve and create useful objets
        var eBot_Top:DDLSEdge = edge;
        var eTop_Bot:DDLSEdge = edge.oppositeEdge;
        var eLeft_Right:DDLSEdge = new DDLSEdge();
        var eRight_Left:DDLSEdge = new DDLSEdge();
        var eTop_Left:DDLSEdge = eBot_Top.nextLeftEdge;
        var eLeft_Bot:DDLSEdge = eTop_Left.nextLeftEdge;
        var eBot_Right:DDLSEdge = eTop_Bot.nextLeftEdge;
        var eRight_Top:DDLSEdge = eBot_Right.nextLeftEdge;
        
        var vBot:DDLSVertex = eBot_Top.originVertex;
        var vTop:DDLSVertex = eTop_Bot.originVertex;
        var vLeft:DDLSVertex = eLeft_Bot.originVertex;
        var vRight:DDLSVertex = eRight_Top.originVertex;
        
        var fLeft:DDLSFace = eBot_Top.leftFace;
        var fRight:DDLSFace = eTop_Bot.leftFace;
        var fBot:DDLSFace = new DDLSFace();
        var fTop:DDLSFace = new DDLSFace();
                
        // add the new edges
        this._edges.push(eLeft_Right);
        this._edges.push(eRight_Left);
        
        // add the new faces
        this._faces.push( fTop );
        this._faces.push( fBot );
        
        // set vertex, edge and face references for the new LEFT_RIGHT and RIGHT-LEFT edges
        eLeft_Right.setDatas(vLeft, eRight_Left, eRight_Top, fTop, edge.isReal, edge.isConstrained);
        eRight_Left.setDatas(vRight, eLeft_Right, eLeft_Bot, fBot, edge.isReal, edge.isConstrained);
        
        // set edge references for the new TOP and BOTTOM faces
        fTop.setDatas(eLeft_Right);
        fBot.setDatas(eRight_Left);
        
        // this.check the edge references of TOP and BOTTOM vertices
        if ( vTop.edge == eTop_Bot )
            vTop.setDatas(eTop_Left);
        if ( vBot.edge == eBot_Top )
            vBot.setDatas(eBot_Right);
        
        // set the new edge and face references for the 4 bouding edges
        eTop_Left.nextLeftEdge = eLeft_Right;
        eTop_Left.leftFace = fTop;
        eLeft_Bot.nextLeftEdge = eBot_Right;
        eLeft_Bot.leftFace = fBot;
        eBot_Right.nextLeftEdge = eRight_Left;
        eBot_Right.leftFace = fBot;
        eRight_Top.nextLeftEdge = eTop_Left;
        eRight_Top.leftFace = fTop;
        
        // remove the old TOP-BOTTOM and BOTTOM-TOP edges
        eBot_Top.dispose();
        eTop_Bot.dispose();
        this._edges.splice(eBot_Top);
        this._edges.splice(eTop_Bot);
        
        // remove the old LEFT and RIGHT faces
        fLeft.dispose();
        fRight.dispose();
        this._faces.splice(fLeft);
        this._faces.splice(fRight);
        
        return eRight_Left;
    }
    
    public splitEdge(edge:DDLSEdge, x:number, y:number):DDLSVertex
    {
        // empty old references
        this.__edgesToCheck.splice(0, this.__edgesToCheck.length);
        
        // retrieve useful objets
        var eLeft_Right:DDLSEdge = edge;
        var eRight_Left:DDLSEdge = eLeft_Right.oppositeEdge;
        var eRight_Top:DDLSEdge = eLeft_Right.nextLeftEdge;
        var eTop_Left:DDLSEdge = eRight_Top.nextLeftEdge;
        var eLeft_Bot:DDLSEdge = eRight_Left.nextLeftEdge;
        var eBot_Right:DDLSEdge = eLeft_Bot.nextLeftEdge;
        
        var vTop:DDLSVertex = eTop_Left.originVertex;
        var vLeft:DDLSVertex = eLeft_Right.originVertex;
        var vBot:DDLSVertex = eBot_Right.originVertex;
        var vRight:DDLSVertex = eRight_Left.originVertex;
        
        var fTop:DDLSFace = eLeft_Right.leftFace;
        var fBot:DDLSFace = eRight_Left.leftFace;
        
        // this.check distance from the position to edge end points
        if ( (vLeft.pos.x - x)*(vLeft.pos.x - x) + (vLeft.pos.y - y)*(vLeft.pos.y - y) <= DDLSConstants.EPSILON_SQUARED )
            return vLeft;
        if ( (vRight.pos.x - x)*(vRight.pos.x - x) + (vRight.pos.y - y)*(vRight.pos.y - y) <= DDLSConstants.EPSILON_SQUARED )
            return vRight;
        
        // create new objects
        var vCenter:DDLSVertex = new DDLSVertex();
        
        var eTop_Center:DDLSEdge = new DDLSEdge();
        var eCenter_Top:DDLSEdge = new DDLSEdge();
        var eBot_Center:DDLSEdge = new DDLSEdge();
        var eCenter_Bot:DDLSEdge = new DDLSEdge();
        
        var eLeft_Center:DDLSEdge = new DDLSEdge();
        var eCenter_Left:DDLSEdge = new DDLSEdge();
        var eRight_Center:DDLSEdge = new DDLSEdge();
        var eCenter_Right:DDLSEdge = new DDLSEdge();
        
        var fTopLeft:DDLSFace = new DDLSFace();
        var fBotLeft:DDLSFace = new DDLSFace();
        var fBotRight:DDLSFace = new DDLSFace();
        var fTopRight:DDLSFace = new DDLSFace();
        
        // add the new vertex
        this._vertices.push(vCenter);
        
        // add the new edges
        this._edges.push(eCenter_Top);
        this._edges.push(eTop_Center);
        this._edges.push(eCenter_Left);
        this._edges.push(eLeft_Center);
        this._edges.push(eCenter_Bot);
        this._edges.push(eBot_Center);
        this._edges.push(eCenter_Right);
        this._edges.push(eRight_Center);
        
        // add the new faces
        this._faces.push(fTopRight);
        this._faces.push(fBotRight);
        this._faces.push(fBotLeft);
        this._faces.push(fTopLeft);
        
        // set pos and edge reference for the new CENTER vertex
        vCenter.setDatas( fTop.isReal ? eCenter_Top : eCenter_Bot);
        vCenter.pos.x = x;
        vCenter.pos.y = y;
        DDLSGeom2D.projectOrthogonaly(vCenter.pos, eLeft_Right);
        
        // set the new vertex, edge and face references for the new 8 center crossing edges
        eCenter_Top.setDatas(vCenter, eTop_Center, eTop_Left, fTopLeft, fTop.isReal);
        eTop_Center.setDatas(vTop, eCenter_Top, eCenter_Right, fTopRight, fTop.isReal);
        eCenter_Left.setDatas(vCenter, eLeft_Center, eLeft_Bot, fBotLeft, edge.isReal, edge.isConstrained);
        eLeft_Center.setDatas(vLeft, eCenter_Left, eCenter_Top, fTopLeft, edge.isReal, edge.isConstrained);
        eCenter_Bot.setDatas(vCenter, eBot_Center, eBot_Right, fBotRight, fBot.isReal);
        eBot_Center.setDatas(vBot, eCenter_Bot, eCenter_Left, fBotLeft, fBot.isReal);
        eCenter_Right.setDatas(vCenter, eRight_Center, eRight_Top, fTopRight, edge.isReal, edge.isConstrained);
        eRight_Center.setDatas(vRight, eCenter_Right, eCenter_Bot, fBotRight, edge.isReal, edge.isConstrained);
        
        // set the new edge references for the new 4 faces
        fTopLeft.setDatas(eCenter_Top, fTop.isReal);
        fBotLeft.setDatas(eCenter_Left, fBot.isReal);
        fBotRight.setDatas(eCenter_Bot, fBot.isReal);
        fTopRight.setDatas(eCenter_Right, fTop.isReal);
        
        // this.check the edge references of LEFT and RIGHT vertices
        if ( vLeft.edge == eLeft_Right )
            vLeft.setDatas(eLeft_Center);
        if ( vRight.edge == eRight_Left )
            vRight.setDatas(eRight_Center);
        
        // set the new edge and face references for the 4 bounding edges
        eTop_Left.nextLeftEdge = eLeft_Center;
        eTop_Left.leftFace = fTopLeft;
        eLeft_Bot.nextLeftEdge = eBot_Center;
        eLeft_Bot.leftFace = fBotLeft;
        eBot_Right.nextLeftEdge = eRight_Center;
        eBot_Right.leftFace = fBotRight;
        eRight_Top.nextLeftEdge = eTop_Center;
        eRight_Top.leftFace = fTopRight;
        
        // if the edge was constrained, we must:
        // - add the segments the edge is from to the 2 new
        // - update the segments the edge is from by deleting the old edge and inserting the 2 new
        // - add the segments the edge is from to the new vertex
        if (eLeft_Right.isConstrained)
        {
            var fromSegments:DDLSConstraintSegment[] = eLeft_Right.fromConstraintSegments;
            eLeft_Center.fromConstraintSegments = fromSegments.slice(0);
            eCenter_Left.fromConstraintSegments = eLeft_Center.fromConstraintSegments;
            eCenter_Right.fromConstraintSegments = fromSegments.slice(0);
            eRight_Center.fromConstraintSegments = eCenter_Right.fromConstraintSegments;
            
            var edges:DDLSEdge[];
            var index:number;
            for (var i:number=0 ; i<eLeft_Right.fromConstraintSegments.length ; i++)
            {
                edges = eLeft_Right.fromConstraintSegments[i].edges;
                index = edges.indexOf(eLeft_Right);
                if (index != -1)
                    edges.splice(index, 1, eLeft_Center, eCenter_Right);
                else
                    edges.splice(edges.indexOf(eRight_Left), 1, eRight_Center, eCenter_Left);
            }
            
            vCenter.fromConstraintSegments = fromSegments.slice(0);
        }
        
        // remove the old LEFT-RIGHT and RIGHT-LEFT edges
        eLeft_Right.dispose();
        eRight_Left.dispose();
        this._edges.splice(eLeft_Right);
        this._edges.splice(eRight_Left);
        
        // remove the old TOP and BOTTOM faces
        fTop.dispose();
        fBot.dispose();
        this._faces.splice(fTop);
        this._faces.splice(fBot);
        
        // add new bounds references for Delaunay restoring
        this.__centerVertex = vCenter;
        this.__edgesToCheck.push(eTop_Left);
        this.__edgesToCheck.push(eLeft_Bot);
        this.__edgesToCheck.push(eBot_Right);
        this.__edgesToCheck.push(eRight_Top);
        
        return vCenter;
    }
    
    public splitFace(face:DDLSFace, x:number, y:number):DDLSVertex
    {
        // empty old references
        this.__edgesToCheck.splice(0, this.__edgesToCheck.length);
        
        // retrieve useful objects
        var eTop_Left:DDLSEdge = face.edge;
        var eLeft_Right:DDLSEdge = eTop_Left.nextLeftEdge;
        var eRight_Top:DDLSEdge = eLeft_Right.nextLeftEdge;
        
        var vTop:DDLSVertex = eTop_Left.originVertex;
        var vLeft:DDLSVertex = eLeft_Right.originVertex;
        var vRight:DDLSVertex = eRight_Top.originVertex;
        
        // create new objects
        var vCenter:DDLSVertex = new DDLSVertex();
        
        var eTop_Center:DDLSEdge = new DDLSEdge();
        var eCenter_Top:DDLSEdge = new DDLSEdge();
        var eLeft_Center:DDLSEdge = new DDLSEdge();
        var eCenter_Left:DDLSEdge = new DDLSEdge();
        var eRight_Center:DDLSEdge = new DDLSEdge();
        var eCenter_Right:DDLSEdge = new DDLSEdge();
        
        var fTopLeft:DDLSFace = new DDLSFace();
        var fBot:DDLSFace = new DDLSFace();
        var fTopRight:DDLSFace = new DDLSFace();
        
        // add the new vertex
        this._vertices.push(vCenter);
        
        // add the new edges
        this._edges.push(eTop_Center);
        this._edges.push(eCenter_Top);
        this._edges.push(eLeft_Center);
        this._edges.push(eCenter_Left);
        this._edges.push(eRight_Center);
        this._edges.push(eCenter_Right);
        
        // add the new faces
        this._faces.push(fTopLeft);
        this._faces.push(fBot);
        this._faces.push(fTopRight);
        
        // set pos and edge reference for the new CENTER vertex
        vCenter.setDatas(eCenter_Top);
        vCenter.pos.x = x;
        vCenter.pos.y = y;
        
        // set the new vertex, edge and face references for the new 6 center crossing edges
        eTop_Center.setDatas(vTop, eCenter_Top, eCenter_Right, fTopRight );
        eCenter_Top.setDatas(vCenter, eTop_Center, eTop_Left, fTopLeft );
        eLeft_Center.setDatas(vLeft, eCenter_Left, eCenter_Top, fTopLeft );
        eCenter_Left.setDatas(vCenter, eLeft_Center, eLeft_Right, fBot );
        eRight_Center.setDatas(vRight, eCenter_Right, eCenter_Left, fBot );
        eCenter_Right.setDatas(vCenter, eRight_Center, eRight_Top, fTopRight );
        
        // set the new edge references for the new 3 faces
        fTopLeft.setDatas(eCenter_Top);
        fBot.setDatas(eCenter_Left);
        fTopRight.setDatas(eCenter_Right);
        
        // set the new edge and face references for the 3 bounding edges
        eTop_Left.nextLeftEdge = eLeft_Center;
        eTop_Left.leftFace = fTopLeft;
        eLeft_Right.nextLeftEdge = eRight_Center;
        eLeft_Right.leftFace = fBot;
        eRight_Top.nextLeftEdge = eTop_Center;
        eRight_Top.leftFace = fTopRight;
        
        // we remove the old face
        face.dispose();
        this._faces.splice(face);
        
        // add new bounds references for Delaunay restoring
        this.__centerVertex = vCenter;
        this.__edgesToCheck.push(eTop_Left);
        this.__edgesToCheck.push(eLeft_Right);
        this.__edgesToCheck.push(eRight_Top);
        
        return vCenter;
    }
    
    public restoreAsDelaunay():void
    {
        var edge:DDLSEdge;
        while (this.__edgesToCheck.length)
        {
            edge = this.__edgesToCheck.shift();
            if (edge.isReal && ! edge.isConstrained && ! DDLSGeom2D.isDelaunay(edge))
            {
                if (edge.nextLeftEdge.destinationVertex == this.__centerVertex)
                {
                    this.__edgesToCheck.push(edge.nextRightEdge);
                    this.__edgesToCheck.push(edge.prevRightEdge);
                }
                else
                {
                    this.__edgesToCheck.push(edge.nextLeftEdge);
                    this.__edgesToCheck.push(edge.prevLeftEdge);
                }
                this.flipEdge(edge);
            }
        }
    }
    
    // Delete a vertex IF POSSIBLE and then fill the hole with a new triangulation.
    // A vertex can be deleted if:
    // - it is free of constraint segment (no adjacency to any constrained edge)
    // - it is adjacent to exactly 2 contrained edges and is not an end point of any constraint segment
    public deleteVertex(vertex:DDLSVertex):boolean
    {
        //console.log("tryToDeleteVertex this.id", vertex.id);
        var i:number;
        var freeOfConstraint:boolean;
        var iterEdges:IteratorFromVertexToOutgoingEdges = new IteratorFromVertexToOutgoingEdges();
        iterEdges.fromVertex = vertex;
        iterEdges.realEdgesOnly = false;
        var edge:DDLSEdge;
        var outgoingEdges:DDLSEdge[] = [];
        
        freeOfConstraint = vertex.fromConstraintSegments.length == 0;
        
        //console.log("  -> freeOfConstraint", freeOfConstraint);
        
        var bound:DDLSEdge[] = [];
        if (freeOfConstraint)
        {
            edge = iterEdges.next();
            while ( edge )
            {
                outgoingEdges.push(edge);
                bound.push( edge.nextLeftEdge );
                edge = iterEdges.next();
            }
        }
        else
        {
            // we this.check if the vertex is an end point of a constraint segment
            var edges:DDLSEdge[];
            for (i=0 ; i<vertex.fromConstraintSegments.length ; i++)
            {
                edges = vertex.fromConstraintSegments[i].edges;
                if ( edges[0].originVertex == vertex
                    || edges[edges.length-1].destinationVertex == vertex )
                {
                    //console.log("  -> is end point of a constraint segment");
                    return false;
                }
            }
            
            // we this.check the count of adjacent constrained edges
            var count:number = 0;
            edge = iterEdges.next();
            while ( edge )
            {
                outgoingEdges.push(edge);
                
                if (edge.isConstrained)
                {
                    count++;
                    if (count > 2)
                    {
                        //console.log("  -> count of adjacent constrained edges", count);
                        return false;
                    }
                }
                edge = iterEdges.next();
            }
            
            // if not disqualified, then we can process
            //console.log("process vertex deletion");
            var boundA:DDLSEdge[] = [];
            var boundB:DDLSEdge[] = [];
            var constrainedEdgeA:DDLSEdge;
            var constrainedEdgeB:DDLSEdge;
            var edgeA:DDLSEdge = new DDLSEdge();
            var edgeB:DDLSEdge = new DDLSEdge();
            var realA:boolean;
            var realB:boolean;
            this._edges.push(edgeA);
            this._edges.push(edgeB);
            for (i=0;  i < outgoingEdges.length; i++) 
            {
                edge = outgoingEdges[i];
                if (edge.isConstrained)
                {
                    if (!constrainedEdgeA)
                    {
                        edgeB.setDatas(edge.destinationVertex, edgeA, null, null, true, true);
                        boundA.push(edgeA, edge.nextLeftEdge);
                        boundB.push(edgeB);
                        constrainedEdgeA = edge;
                    }
                    else if (!constrainedEdgeB)
                    {
                        edgeA.setDatas(edge.destinationVertex, edgeB, null, null, true, true);
                        boundB.push(edge.nextLeftEdge);
                        constrainedEdgeB = edge;
                    }
                }
                else
                {
                    if (!constrainedEdgeA)
                        boundB.push(edge.nextLeftEdge);
                    else if (!constrainedEdgeB)
                        boundA.push(edge.nextLeftEdge);
                    else
                        boundB.push(edge.nextLeftEdge);
                }
            }
            
            // keep infos about reality
            realA = constrainedEdgeA.leftFace.isReal;
            realB = constrainedEdgeB.leftFace.isReal;
            
            // we update the segments infos
            edgeA.fromConstraintSegments = constrainedEdgeA.fromConstraintSegments.slice(0);
            edgeB.fromConstraintSegments = edgeA.fromConstraintSegments;
            var index:number;
            for (i=0 ; i<vertex.fromConstraintSegments.length ; i++)
            {
                edges = vertex.fromConstraintSegments[i].edges;
                index = edges.indexOf(constrainedEdgeA);
                if (index != -1)
                {
                    edges.splice(index-1, 2, edgeA);
                }
                else
                {
                    edges.splice(edges.indexOf(constrainedEdgeB)-1, 2, edgeB);
                }
            }
        }
        
        // Deletion of old faces and edges
        var faceToDelete:DDLSFace;
        for (i=0; i < outgoingEdges.length; i++) 
        {
            edge = outgoingEdges[i];
            
            faceToDelete = edge.leftFace;
            this._faces.splice(faceToDelete);
            faceToDelete.dispose();
            
            edge.destinationVertex.edge = edge.nextLeftEdge;
            
            this._edges.splice(edge.oppositeEdge);
            edge.oppositeEdge.dispose();
            this._edges.splice(edge);
            edge.dispose();
        }
        
        this._vertices.splice( this._vertices.indexOf(vertex), 1);
        vertex.dispose();
        
        // finally we this.triangulate
        if (freeOfConstraint)
        {
            //console.log("trigger single hole triangulation");
            this.triangulate(bound, true);
        }
        else
        {
            //console.log("trigger dual holes triangulation");
            this.triangulate(boundA, realA);
            this.triangulate(boundB, realB);
        }
        
        //this.check();
        return true;
    }
    
    ///// PRIVATE
    
    
    
    // this.untriangulate is usually used while a new edge insertion in order to delete the intersected edges
    // edgesList is a list of chained edges oriented from right to left
    private untriangulate(edgesList:DDLSEdge[]):void
    {
        // we clean useless faces and adjacent vertices
        var i:number;
        var verticesCleaned:any = {};
        var currEdge:DDLSEdge;
        var outEdge:DDLSEdge;
        for ( i=0 ; i<edgesList.length ; i++ )
        {
            currEdge = edgesList[i];
            //
            if (!verticesCleaned[currEdge.originVertex.id])
            {
                currEdge.originVertex.edge = currEdge.prevLeftEdge.oppositeEdge;
                verticesCleaned[currEdge.originVertex.id] = true;
            }
            if (!verticesCleaned[currEdge.destinationVertex.id])
            {
                currEdge.destinationVertex.edge = currEdge.nextLeftEdge;
                verticesCleaned[currEdge.destinationVertex.id] = true;
            }
            //
            this._faces.splice(currEdge.leftFace);
            currEdge.leftFace.dispose();
            if (i == edgesList.length-1)
            {
                this._faces.splice(currEdge.rightFace);
                currEdge.rightFace.dispose();
            }
            //
        }
        
        // finally we delete the intersected edges
        for ( i=0 ; i<edgesList.length ; i++ )
        {
            currEdge = edgesList[i];
            this._edges.splice(currEdge.oppositeEdge);
            this._edges.splice(currEdge);
            currEdge.oppositeEdge.dispose();
            currEdge.dispose();
        }
    }
    
    // this.triangulate is usually used to fill the hole after deletion of a vertex from mesh or after untriangulation
    // - bounds is the list of edges in CCW bounding the surface to retriangulate,
    private triangulate( bound:DDLSEdge[], isReal:boolean ):void
    {
        if (bound.length < 2)
        {
            console.log("BREAK ! the hole has less than 2 edges");
            return;
        }
        // if the hole is a 2 edges polygon, we have a big problem
        else if (bound.length == 2)
        {
            //throw new Error("BREAK ! the hole has only 2 edges! " + "  - edge0: " + bound[0].originVertex.id + " -> " + bound[0].destinationVertex.id + "  - edge1: " +  bound[1].originVertex.id + " -> " + bound[1].destinationVertex.id);
            console.log("BREAK ! the hole has only 2 edges");
            console.log("  - edge0:", bound[0].originVertex.id, "->", bound[0].destinationVertex.id);
            console.log("  - edge1:", bound[1].originVertex.id, "->", bound[1].destinationVertex.id);
            return;
        }
        // if the hole is a 3 edges polygon:
        else if ( bound.length == 3 )
        {
            /*console.log("the hole is a 3 edges polygon");
            console.log("  - edge0:", bound[0].originVertex.id, "->", bound[0].destinationVertex.id);
            console.log("  - edge1:", bound[1].originVertex.id, "->", bound[1].destinationVertex.id);
            console.log("  - edge2:", bound[2].originVertex.id, "->", bound[2].destinationVertex.id);*/
            var f:DDLSFace = new DDLSFace();
            f.setDatas(bound[0], isReal);
            this._faces.push(f);
            bound[0].leftFace = f;
            bound[1].leftFace = f;
            bound[2].leftFace = f;
            bound[0].nextLeftEdge = bound[1];
            bound[1].nextLeftEdge = bound[2];
            bound[2].nextLeftEdge = bound[0];
        }
        else // if more than 3 edges, we process recursively:
        {
            //console.log("the hole has", bound.length, "edges");
            for (i=0 ; i<bound.length ; i++)
            {
                //console.log("  - edge", i, ":", bound[i].originVertex.id, "->", bound[i].destinationVertex.id);
            }
                
            var baseEdge:DDLSEdge = bound[0];
            var vertexA:DDLSVertex = baseEdge.originVertex;
            var vertexB:DDLSVertex = baseEdge.destinationVertex;
            var vertexC:DDLSVertex;
            var vertexCheck:DDLSVertex;
            var circumcenter:DDLSPoint2D = new DDLSPoint2D();
            var radiusSquared:number;
            var distanceSquared:number;
            var isDelaunay:boolean;
            var index:number;
            var i:number;
            for (i=2 ; i<bound.length ; i++ )
            {
                vertexC = bound[i].originVertex;
                if ( DDLSGeom2D.getRelativePosition2(vertexC.pos.x, vertexC.pos.y, baseEdge) == 1 )
                {
                    index = i;
                    isDelaunay = true;
                    DDLSGeom2D.getCircumcenter(vertexA.pos.x, vertexA.pos.y, vertexB.pos.x, vertexB.pos.y, vertexC.pos.x, vertexC.pos.y, circumcenter);
                    radiusSquared = (vertexA.pos.x - circumcenter.x)*(vertexA.pos.x - circumcenter.x) + (vertexA.pos.y - circumcenter.y)*(vertexA.pos.y - circumcenter.y);
                    // for perfect regular n-sides polygons, checking strict delaunay circumcircle condition is not possible, so we substract EPSILON to circumcircle radius:
                    radiusSquared -= DDLSConstants.EPSILON_SQUARED;
                    for (var j:number=2 ; j<bound.length ; j++ )
                    {
                        if ( j != i )
                        {
                            vertexCheck = bound[j].originVertex;
                            distanceSquared = (vertexCheck.pos.x - circumcenter.x)*(vertexCheck.pos.x - circumcenter.x) + (vertexCheck.pos.y - circumcenter.y)*(vertexCheck.pos.y - circumcenter.y);
                            if ( distanceSquared < radiusSquared )
                            {
                                isDelaunay = false;
                                break;
                            }
                        }
                    }
                    
                    if (isDelaunay)
                        break;
                }
            }
            
            if (!isDelaunay)
            {
                // for perfect regular n-sides polygons, checking delaunay circumcircle condition is not possible
                console.log("NO DELAUNAY FOUND");
                var s:string = "";
                for (i=0 ; i<bound.length ; i++)
                {
                    s += bound[i].originVertex.pos.x + " , ";
                    s += bound[i].originVertex.pos.y + " , ";
                    s += bound[i].destinationVertex.pos.x + " , ";
                    s += bound[i].destinationVertex.pos.y + " , ";
                }
                //console.log(s);
                
                index = 2;
            }
            //console.log("index", index, "on", bound.length);
            
            var edgeA:DDLSEdge;
            var edgeAopp:DDLSEdge;
            var edgeB:DDLSEdge;
            var edgeBopp:DDLSEdge;
            var boundA:DDLSEdge[];
            var boundM:DDLSEdge[];
            var boundB:DDLSEdge[];
            
            if (index < (bound.length-1))
            {
                edgeA = new DDLSEdge();
                edgeAopp = new DDLSEdge();
                this._edges.push(edgeA);
                this._edges.push(edgeAopp);
                edgeA.setDatas(vertexA, edgeAopp, null, null, isReal, false);
                edgeAopp.setDatas(bound[index].originVertex, edgeA, null, null, isReal, false);
                boundA = bound.slice(index);
                boundA.push(edgeA);
                this.triangulate(boundA, isReal);
            }
            
            if ( index > 2 )
            {
                edgeB = new DDLSEdge();
                edgeBopp = new DDLSEdge();
                this._edges.push(edgeB);
                this._edges.push(edgeBopp);
                edgeB.setDatas(bound[1].originVertex, edgeBopp, null, null, isReal, false);
                edgeBopp.setDatas(bound[index].originVertex, edgeB, null, null, isReal, false);
                boundB = bound.slice(1, index);
                boundB.push(edgeBopp);
                this.triangulate(boundB, isReal);
            }
            
            boundM = [];
            if (index == 2)
                boundM.push(baseEdge, bound[1], edgeAopp);
            else if (index == (bound.length-1))
                boundM.push(baseEdge, edgeB, bound[index]);
            else
                boundM.push(baseEdge, edgeB, edgeAopp );
            this.triangulate(boundM, isReal);
        }
    }
    
    public debug():void
    {
        var i:number;
        for (i = 0; i < this.__vertices.length; i++) 
        {
            console.log("-- vertex", this._vertices[i].id);
            console.log("  edge", this._vertices[i].edge.id, " - ", this._vertices[i].edge);
            console.log("  edge isReal:", this._vertices[i].edge.isReal);
        }
        for (i = 0; i < this.__edges.length; i++) 
        {
            console.log("-- edge", this.__edges[i]);
            console.log("  isReal", this.__edges[i].id, " - ",  this.__edges[i].isReal);
            console.log("  nextLeftEdge", this.__edges[i].nextLeftEdge);
            console.log("  oppositeEdge", this.__edges[i].oppositeEdge);
        }
    }  
}

class EdgeMap{
    private content:any;
    private dataChanged:boolean;
    constructor(){
        this.content={};
    }
    public push(value:DDLSEdge):void{
        var old:DDLSEdge=this.content[value.id];
        if(old){
            throw new Error("重复添加");
        }
        this.content[value.id]=value;
        this.dataChanged=true;
    }
    public splice(edge:DDLSEdge):void{
        var old:DDLSEdge=this.content[edge.id];
        delete this.content[edge.id];
        this.dataChanged=true;
    }
    private _vector:DDLSEdge[];
    public get vector():DDLSEdge[]{
        if(!this._vector){
            this._vector=[];
        }
        if(this.dataChanged){
            this._vector.length=0;
            for(var i of this.content) 
            {
                this._vector.push(i);
            }
            this.dataChanged=false;
        }
        return this._vector;
    }

    public dispose():void{
        for(var i of this.content) 
        {
            i.dispose();
        }
        this.content=null;
        this._vector.length=0;
        this._vector=null;
    }
}

class FaceMap{
    private content:any;
    private dataChanged:boolean;
    constructor(){
        this.content= {};
    }

    public push(value:DDLSFace):void{
        var old:DDLSFace=this.content[value.id];
        if(old){
            throw new Error("重复添加");
        }
        this.content[value.id]=value;
        this.dataChanged=true;
    }

    public splice(edge:DDLSFace):void{
        var old:DDLSFace=this.content[edge.id];
        delete this.content[edge.id];
        this.dataChanged=true;
    }
    private _vector:DDLSFace[];
    public get vector():DDLSFace[]{
        if(!this._vector){
            this._vector=[];
        }
        if(this.dataChanged){
            this._vector.length=0;
            for(var i of this.content) 
            {
                this._vector.push(i);
            }
            this.dataChanged=false;
        }
        return this._vector;
    }

    public dispose():void{
        for (var i of this.content) 
        {
            i.dispose();
        }
        this.content=null;
        this._vector.length=0;
        this._vector=null;
    }
}
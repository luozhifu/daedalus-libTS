import { DDLSVertex } from "./DDLSVertex";
import { DDLSFace } from "./DDLSFace";
import { DDLSConstraintSegment } from "./DDLSConstraintSegment";


export class DDLSEdge
{
	
	private static INC:number = 0;
	private _id:number;
	
	// root datas
	private _isReal:boolean;
	private _isConstrained:boolean;
	private _originVertex:DDLSVertex;
	private _oppositeEdge:DDLSEdge;
	private _nextLeftEdge:DDLSEdge;
	private _leftFace:DDLSFace;
	
	private _fromConstraintSegments:DDLSConstraintSegment[];
	
	public colorDebug:number = -1;
	
	constructor()
	{
		this._id = DDLSEdge.INC;
		DDLSEdge.INC++;
		
		this._fromConstraintSegments = [];
	}
	
	public get id():number
	{
		return this._id;
	}
	
	public get isReal():boolean
	{
		return this._isReal;
	}
	
	public get isConstrained():boolean
	{
		return this._isConstrained;
	}
	
	public setDatas( originVertex:DDLSVertex
							, oppositeEdge:DDLSEdge
							, nextLeftEdge:DDLSEdge
							, leftFace:DDLSFace
							, isReal:boolean=true
							, isConstrained:boolean=false):void
	{
		this._isConstrained = isConstrained;
		this._isReal = isReal;
		this._originVertex = originVertex;
		this._oppositeEdge = oppositeEdge;
		this._nextLeftEdge = nextLeftEdge;
		this._leftFace = leftFace;
	}
	
	public addFromConstraintSegment(segment:DDLSConstraintSegment):void
	{
		if ( this._fromConstraintSegments.indexOf(segment) == -1 )
			this._fromConstraintSegments.push(segment);
	}
	
	public removeFromConstraintSegment(segment:DDLSConstraintSegment):void
	{
		var index:number = this._fromConstraintSegments.indexOf(segment);
		if ( index != -1 )
			this._fromConstraintSegments.splice(index, 1);
	}
	
	public set originVertex(value:DDLSVertex)
	{
		this._originVertex = value;
	}
	
	public set nextLeftEdge(value:DDLSEdge)
	{
		this._nextLeftEdge = value;
	}
	
	public set leftFace(value:DDLSFace)
	{
		this._leftFace = value;
	}
	
	public set isConstrained(value:boolean)
	{
		this._isConstrained = value;
	}
	
	public get fromConstraintSegments():DDLSConstraintSegment[]
	{
		return this._fromConstraintSegments;
	}
	
	public set fromConstraintSegments(value:DDLSConstraintSegment[])
	{
		this._fromConstraintSegments = value;
	}
	
	public dispose():void
	{
		this._originVertex = null;
		this._oppositeEdge = null;
		this._nextLeftEdge = null;
		this._leftFace = null;
		this._fromConstraintSegments = null;
	}
	
	public get originVertex()		:DDLSVertex	{	return this._originVertex;											}
	public get destinationVertex()	:DDLSVertex	{	return this._oppositeEdge.originVertex;								}
	public get oppositeEdge()		:DDLSEdge		{	return this._oppositeEdge;											}
	public get nextLeftEdge()		:DDLSEdge		{	return this._nextLeftEdge;											}
	public get prevLeftEdge()		:DDLSEdge		{	return this._nextLeftEdge.nextLeftEdge;								}
	public get nextRightEdge()		:DDLSEdge		{	return this._oppositeEdge.nextLeftEdge.nextLeftEdge.oppositeEdge;	}
	public get prevRightEdge()		:DDLSEdge		{	return this._oppositeEdge.nextLeftEdge.oppositeEdge;					}
	public get rotLeftEdge()		:DDLSEdge		{	return this._nextLeftEdge.nextLeftEdge.oppositeEdge;					}
	public get rotRightEdge()		:DDLSEdge		{	return this._oppositeEdge.nextLeftEdge;								}
	public get leftFace()			:DDLSFace		{	return this._leftFace;												}
	public get rightFace()			:DDLSFace		{	return this._oppositeEdge.leftFace;									}
	
	
	public toString():string
	{
		return "edge " + this.originVertex.id + " - " + this.destinationVertex.id;
	}
}
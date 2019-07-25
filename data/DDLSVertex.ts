import { DDLSPoint2D } from "./math/DDLSPoint2D";
import { DDLSEdge } from "./DDLSEdge";
import { DDLSConstraintSegment } from "./DDLSConstraintSegment";

export class DDLSVertex
{
    
    private static INC:number = 0;
    private _id:number;
    
    private _pos:DDLSPoint2D;
    
    private _isReal:boolean;
    private _edge:DDLSEdge;
    
    private _fromConstraintSegments:DDLSConstraintSegment[];
    
    public colorDebug:number = - 1;
    
    constructor()
    {
        this._id = DDLSVertex.INC;
        DDLSVertex.INC++;
        
        this._pos = new DDLSPoint2D();
        
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
    
    public get pos():DDLSPoint2D
    {
        return this._pos;
    }
    
    public get fromConstraintSegments():DDLSConstraintSegment[]
    {
        return this._fromConstraintSegments;
    }
    
    public set fromConstraintSegments(value:DDLSConstraintSegment[])
    {
        this._fromConstraintSegments = value;
    }
    
    public setDatas(edge:DDLSEdge, isReal:boolean=true):void
    {
        this._isReal = isReal;
        this._edge = edge;
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
    
    public dispose():void
    {
        this._pos = null;
        this._edge = null;
        this._fromConstraintSegments = null;
    }
    
    public get edge():DDLSEdge
    {
        return this._edge;
    }
    
    public set edge(value:DDLSEdge)
    {
        this._edge = value;
    }
    
    public toString():string
    {
        return "ver_id " + this._id;
    }
    
}

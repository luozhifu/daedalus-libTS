import { DDLSMatrix2D } from "./DDLSMatrix2D";

export class DDLSPoint2D
{
    private static INC:number = 0;
    private _id:number;

    private _x:number;
    private _y:number;

    constructor(x:number=0,y:number=0)
    {
        this._id = DDLSPoint2D.INC;
        DDLSPoint2D.INC++;

        this.setTo(x,y);
    }

    public get id():number
    {
        return this._id;
    }
    
    public transform(matrix:DDLSMatrix2D):void
    {
        matrix.tranform(this);
    }

    public setTo(x:number,y:number):void{
        this._x = x;
        this._y = y;
    }

    public clone():DDLSPoint2D
    {
        return new DDLSPoint2D(this._x,this._y);
    }

    public substract(p:DDLSPoint2D):void{
        this._x -= p.x;
        this._y -= p.y;
    }

    public get length():number
    {
        return Math.sqrt(this._x*this._x + this._y*this._y);
    }

    public get x() : number 
    {
        return this._x;
    }
    
    public set x(value:number)
    {
        this._x = value;
    }

    public get y() : number 
    {
        return this._y;
    }
    
    public set y(value:number)
    {
        this._y = value;
    }

    public normalize():void{
        let norm:number = this.length;
        this.x /= norm;
        this.y /= norm;
    }

    public scale(s:number):void{
        this.x *= s;
        this.y *= s;
    }

    public distanceTo(p:DDLSPoint2D):number
    {
        var diffX:number = this.x - p.x;
        var diffY:number = this.y - p.y;
        return Math.sqrt(diffX*diffX + diffY*diffY);
    }
    
    public distanceSquaredTo(p:DDLSPoint2D):number
    {
        var diffX:number = this.x - p.x;
        var diffY:number = this.y - p.y;
        return diffX*diffX + diffY*diffY;
    }
}
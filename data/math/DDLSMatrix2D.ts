import { DDLSPoint2D } from "./DDLSPoint2D";

export class DDLSMatrix2D
{
/*	
    DDLSPoint2D represents row vector in homogeneous coordinates:
    [x, y, 1]
    
    DDLSMatrix2D represents transform matrix in homogeneous coordinates:
    [this.a, this.b, 0]
    [this.c, this.d, 0]
    [this.e, this.f, 1]
*/
    
    private _a:number;
    private _b:number;
    private _c:number;
    private _d:number;
    private _e:number;
    private _f:number;
    
    constructor(a:number=1, b:number=0, c:number=0, d:number=1, e:number=0, f:number=0)
    {
        this._a = this.a;
        this._b = this.b;
        this._c = this.c;
        this._d = this.d;
        this._e = this.e;
        this._f = this.f;
    }

    public identity():void
    {
        /*
        [1, 0, 0]
        [0, 1, 0]
        [0, 0, 1]
        */
        
        this._a = 1;
        this._b = 0;
        this._c = 0;
        this._d = 1;
        this._e = 0;
        this._f = 0;
    }
    
    public translate(tx:number, ty:number):void
    {
        /*
        [1,  0,  0]
        [0,  1,  0]
        [tx, ty, 1]
        
        */
        this._e = this._e + tx;
        this._f = this._f + ty;
    }
    
    public scale(sx:number, sy:number):void
    {
        /*
        [sx, 0, 0]
        [0, sy, 0]
        [0,  0, 1]
        */
        this._a = this._a*sx;
        this._b = this._b*sy;
        this._c = this._c*sx;
        this._d = this._d*sy;
        this._e = this._e*sx;
        this._f = this._f*sy;
    }
    
    public rotate(rad:number):void
    {
        /*
                    [ cos, sin, 0]
                    [-sin, cos, 0]
                    [   0,   0, 1]
        
        [this.a, this.b, 0]
        [this.c, this.d, 0]
        [this.e, this.f, 1]
        */
        var cos:number = Math.cos(rad);
        var sin:number = Math.sin(rad);
        var a:number = this._a*cos + this._b*-sin;
        var b:number = this._a*sin + this._b*cos;
        var c:number = this._c*cos + this._d*-sin;
        var d:number = this._c*sin + this._d*cos;
        var e:number = this._e*cos + this._f*-sin;
        var f:number = this._e*sin + this._f*cos;
        this._a = this.a;
        this._b = this.b
        this._c = this.c;
        this._d = this.d;
        this._e = this.e;
        this._f = this.f;
    }
    
    public clone():DDLSMatrix2D
    {
        return new DDLSMatrix2D(this._a, this._b, this._c, this._d, this._e, this._f);
    }
    
    public tranform(point:DDLSPoint2D):void
    {
        /*
                    [this.a, this.b, 0]
                    [this.c, this.d, 0]
                    [this.e, this.f, 1]
        [x, y, 1]
        */
        var x:number = this._a*point.x + this._c*point.y + this.e;
        var y:number = this._b*point.x + this._d*point.y + this.f;
        point.x = x;
        point.y = y;
    }
    
    public transformX(x:number, y:number):number
    {
        return this._a*x + this._c*y + this.e;
    }
    public transformY(x:number, y:number):number
    {
        return this._b*x + this._d*y + this.f;
    }
    
    public concat(matrix:DDLSMatrix2D):void
    {
        var a:number = this._a*matrix.a + this._b*matrix.c;
        var b:number = this._a*matrix.b + this._b*matrix.d;
        var c:number = this._c*matrix.a + this._d*matrix.c;
        var d:number = this._c*matrix.b + this._d*matrix.d;
        var e:number = this._e*matrix.a + this._f*matrix.c + matrix.e;
        var f:number = this._e*matrix.b + this._f*matrix.d + matrix.f;
        this._a = this.a
        this._b = this.b;
        this._c = this.c;
        this._d = this.d;
        this._e = this.e;
        this._f = this.f;
    }
    
    public get a():number
    {
        return this._a;
    }
    
    public set a(value:number)
    {
        this._a = value;
    }
    
    public get b():number
    {
        return this._b;
    }
    
    public set b(value:number)
    {
        this._b = value;
    }
    
    public get c():number
    {
        return this._c;
    }
    
    public set c(value:number)
    {
        this._c = value;
    }
    
    public get d():number
    {
        return this._d;
    }
    
    public set d(value:number)
    {
        this._d = value;
    }
    
    public get e():number
    {
        return this._e;
    }
    
    public set e(value:number)
    {
        this._e = value;
    }
    
    public get f():number
    {
        return this._f;
    }
    
    public set f(value:number)
    {
        this._f = value;
    }
    
}
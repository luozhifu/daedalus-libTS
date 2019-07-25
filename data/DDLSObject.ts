import { DDLSEdge } from "./DDLSEdge";
import { DDLSConstraintShape } from "./DDLSConstraintShape";
import { DDLSMatrix2D } from "./math/DDLSMatrix2D";

export class DDLSObject
{
	
	private static INC:number = 0;
	private _id:number;
	
	private _matrix:DDLSMatrix2D;
	private _coordinates:number[];
	private _constraintShape:DDLSConstraintShape;
	
	private _pivotX:number;
	private _pivotY:number;
	
	private _scaleX:number;
	private _scaleY:number;
	private _rotation:number;
	private _x:number;
	private _y:number;
	
	private _hasChanged:boolean;
	
	constructor()
	{
		this._id = DDLSObject.INC;
		DDLSObject.INC++;
		
		this._pivotX = 0;
		this._pivotY = 0;
		
		this._matrix = new DDLSMatrix2D();
		this._scaleX = 1;
		this._scaleY = 1;
		this._rotation = 0;
		this._x = 0;
		this._y = 0;
		
		this._coordinates = [];
		
		this._hasChanged = false;
	}
	
	public get id():number
	{
		return this._id;
	}
	
	public dispose():void
	{
		this._matrix = null;
		this._coordinates = null;
		this._constraintShape = null;
	}
	
	public updateValuesFromMatrix():void
	{
		
	}
	
	public updateMatrixFromValues():void
	{
		this._matrix.identity();
		this._matrix.translate(-this._pivotX, -this._pivotY);
		this._matrix.scale(this._scaleX, this._scaleY);
		this._matrix.rotate(this._rotation);
		this._matrix.translate(this._x, this._y);
	}
	
	public get pivotX():number
	{
		return this._pivotX;
	}
	
	public set pivotX(value:number)
	{
		this._pivotX = value;
		this._hasChanged = true;
	}
	
	public get pivotY():number
	{
		return this._pivotY;
	}
	
	public set pivotY(value:number)
	{
		this._pivotY = value;
		this._hasChanged = true;
	}
	
	public get scaleX():number
	{
		return this._scaleX;
	}

	public set scaleX(value:number)
	{
		if (this._scaleX != value)
		{
			this._scaleX = value;
			this._hasChanged = true;
		}
	}

	public get scaleY():number
	{
		return this._scaleY;
	}

	public set scaleY(value:number)
	{
		if (this._scaleY != value)
		{
			this._scaleY = value;
			this._hasChanged = true;
		}
	}

	public get rotation():number
	{
		return this._rotation;
	}

	public set rotation(value:number)
	{
		if (this._rotation != value)
		{
			this._rotation = value;
			this._hasChanged = true;
		}
	}

	public get x():number
	{
		return this._x;
	}

	public set x(value:number)
	{
		if (this._x != value)
		{
			this._x = value;
			this._hasChanged = true;
		}
	}

	public get y():number
	{
		return this._y;
	}

	public set y(value:number)
	{
		if (this._y != value)
		{
			this._y = value;
			this._hasChanged = true;
		}
	}

	public get matrix():DDLSMatrix2D
	{
		return this._matrix;
	}

	public set matrix(value:DDLSMatrix2D)
	{
		this._matrix = value;
		this._hasChanged = true;
	}

	public get coordinates():number[]
	{
		return this._coordinates;
	}

	public set coordinates(value:number[])
	{
		this._coordinates = value;
		this._hasChanged = true;
	}

	public get constraintShape():DDLSConstraintShape
	{
		return this._constraintShape;
	}

	public set constraintShape(value:DDLSConstraintShape)
	{
		this._constraintShape = value;
		this._hasChanged = true;
	}

	public get hasChanged():boolean
	{
		return this._hasChanged;
	}

	public set hasChanged(value:boolean)
	{
		this._hasChanged = value;
	}
	
	public get edges():DDLSEdge[]
	{
		var res:DDLSEdge[] = [];
		
		for (var i:number=0 ; i< this._constraintShape.segments.length ; i++)
		{
			for (var j:number=0 ; j<this._constraintShape.segments[i].edges.length ; j++)
				res.push(this._constraintShape.segments[i].edges[j]);
		}
		
		return res;
	}

}
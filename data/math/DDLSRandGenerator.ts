
export class DDLSRandGenerator
{
	
	private _originalSeed:number;
	private _currSeed:number;
	private _rangeMin:number;
	private _rangeMax:number;
	
	private _numIter:number;
	private _tempString:string;
	
	constructor(seed:number=1234, rangeMin:number=0, rangeMax:number=1)
	{
		this._originalSeed = this._currSeed = this.seed;
		this._rangeMin = this.rangeMin;
		this._rangeMax = this.rangeMax;
		
		this._numIter = 0;
	}
	
	public set seed(value:number)		{	this._originalSeed = this._currSeed = value;		}
	public set rangeMin(value:number)	{	this._rangeMin = value;	}
	public set rangeMax(value:number)	{	this._rangeMax = value;	}
	
	public get seed():number					{		return this._originalSeed;	}
	public get rangeMin():number				{		return this._rangeMin;		}
	public get rangeMax():number				{		return this._rangeMax;		}
	
	public reset():void
	{
		this._currSeed = this._originalSeed;
		this._numIter = 0;
	}
	
	public next():number
	{
		this._tempString = "";
		this._tempString +=this._currSeed*this._currSeed;
		
		while (this._tempString.length < 8)
		{
			this._tempString = "0" + this._tempString;
		}
		
		this._currSeed = Number(this._tempString.substr( 1 , 5 ));
		
		var res:number = Math.round(this._rangeMin + (this._currSeed / 99999)*(this._rangeMax - this._rangeMin));
		
		if (this._currSeed == 0)
			this._currSeed = this._originalSeed+this._numIter;
		
		this._numIter++;
		
		if (this._numIter == 200)
			this.reset();
		
		return res;
	}

}
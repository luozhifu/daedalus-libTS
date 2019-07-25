import { DDLSConstraintSegment } from "./DDLSConstraintSegment";

	export class DDLSConstraintShape
	{
		
		private static INC:number = 0;
		private _id:number;
		
		private _segments:DDLSConstraintSegment[];
		
		constructor()
		{
			this._id = DDLSConstraintShape.INC;
			DDLSConstraintShape.INC++;
			
			this._segments = [];
		}
		
		public get id():number
		{
			return this._id;
		}
		
		public get segments():DDLSConstraintSegment[]
		{
			return this._segments;
		}
		
		public dispose():void
		{
			while ( this._segments.length > 0 )
				this._segments.pop().dispose();
			this._segments = null;
		}

	}
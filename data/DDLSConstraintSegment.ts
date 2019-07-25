import { DDLSEdge } from "./DDLSEdge";
import { DDLSConstraintShape } from "./DDLSConstraintShape";

	export class DDLSConstraintSegment
	{
		
		private static INC:number = 0;
		private _id:number;
		
		private _edges:DDLSEdge[];
		private _fromShape:DDLSConstraintShape;
		
		constructor()
		{
			this._id = DDLSConstraintSegment.INC;
			DDLSConstraintSegment.INC++;
			
			this._edges = [];
		}
		
		public get id():number
		{
			return this._id;
		}
		
		public get fromShape():DDLSConstraintShape
		{
			return this._fromShape;
		}

		public set fromShape(value:DDLSConstraintShape)
		{
			this._fromShape = value;
		}
		
		public addEdge(edge:DDLSEdge):void
		{
			if ( this._edges.indexOf(edge) == -1 &&  this._edges.indexOf(edge.oppositeEdge) == -1 )
				this._edges.push(edge);
		}
		
		public removeEdge(edge:DDLSEdge):void
		{
			var index:number;
			index = this._edges.indexOf(edge);
			if ( index == -1 )
				index = this._edges.indexOf(edge.oppositeEdge);
			
			if ( index != -1 )
				this._edges.splice(index, 1);
		}
		
		public get edges():DDLSEdge[]
		{
			return this._edges;
		}
		
		public dispose():void
		{
			this._edges = null;
			this._fromShape = null;
		}
		
		public toString():string
		{
			return "seg_id " + this._id;
		}
		
	}
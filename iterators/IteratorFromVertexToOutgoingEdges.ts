import { DDLSEdge } from "../data/DDLSEdge";
import { DDLSVertex } from "../data/DDLSVertex";


export class IteratorFromVertexToOutgoingEdges
{
	
	private _fromVertex:DDLSVertex;
	private _nextEdge:DDLSEdge;
	
	public realEdgesOnly:boolean = true;
	
	constructor()
	{
		
	}
	
	public set fromVertex( value:DDLSVertex )
	{
		this._fromVertex = value;
		this._nextEdge = this._fromVertex.edge;

		if(this._nextEdge == undefined || this._nextEdge.isReal == undefined)
			throw "aaa";
			

		while ( this.realEdgesOnly && ! this._nextEdge.isReal )
		{
			this._nextEdge = this._nextEdge.rotLeftEdge;

			if(this._nextEdge == undefined || this._nextEdge.isReal == undefined)
				throw "aaa";
		}
	}
	
	private _resultEdge:DDLSEdge;
	public next():DDLSEdge
	{
		if (this._nextEdge)
		{
			this._resultEdge = this._nextEdge;
			do
			{
				this._nextEdge = this._nextEdge.rotLeftEdge;
				if ( this._nextEdge == this._fromVertex.edge )
				{
					this._nextEdge = null;
					break;
				}
			}
			while ( this.realEdgesOnly && ! this._nextEdge.isReal )
		}
		else
		{
			this._resultEdge = null;
		}
		
		return this._resultEdge;
	}
	
}
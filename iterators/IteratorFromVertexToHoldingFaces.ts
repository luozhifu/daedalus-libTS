import { DDLSVertex } from "../data/DDLSVertex";
import { DDLSEdge } from "../data/DDLSEdge";
import { DDLSFace } from "../data/DDLSFace";

export class IteratorFromVertexToHoldingFaces
{
	
	private _fromVertex:DDLSVertex;
	private _nextEdge:DDLSEdge;
	
	constructor()
	{
		
	}
	
	public set fromVertex( value:DDLSVertex )
	{
		this._fromVertex = value;
		this._nextEdge = this._fromVertex.edge;
	}
	
	
	private _resultFace:DDLSFace;
	public next():DDLSFace
	{
		if (this._nextEdge)
		{
			do
			{
				this._resultFace = this._nextEdge.leftFace;
				this._nextEdge = this._nextEdge.rotLeftEdge;
				if ( this._nextEdge == this._fromVertex.edge )
				{
					this._nextEdge = null;
					if (! this._resultFace.isReal)
						this._resultFace = null;
					break;
				}
			}
			while ( ! this._resultFace.isReal )
		}
		else
		{
			this._resultFace = null;
		}
		
		return this._resultFace;
	}
	
}
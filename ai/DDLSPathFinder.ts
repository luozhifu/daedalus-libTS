import { DDLSMesh } from "../data/DDLSMesh";
import { DDLSFace } from "../data/DDLSFace";
import { DDLSEdge } from "../data/DDLSEdge";
import { DDLSGeom2D } from "../data/math/DDLSGeom2D";
import { DDLSAStar } from "./DDLSAStar";
import { DDLSFunnel } from "./DDLSFunnel";

export class DDLSPathFinder
{
	
	private _mesh:DDLSMesh;
	private _astar:DDLSAStar;
	private _funnel:DDLSFunnel;
//		private _entity:DDLSEntityAI;
	private _radius:number;
	
	
	private __listFaces:DDLSFace[];
	private __listEdges:DDLSEdge[];
	
	/**
	 * 寻路工具 
	 * @param pointCreateFunction 点数据创建方法 function(x:number,y:number)
	 */		
	constructor(pointCreateFunction:Function=null)
	{
		this._astar = new DDLSAStar();
		this._funnel = new DDLSFunnel(pointCreateFunction);
		
		this.__listFaces = [];
		this.__listEdges = [];
	}
	
	public dispose():void
	{
		this._mesh = null;
		this._astar.dispose();
		this._astar = null;
		this._funnel.dispose();
		this._funnel = null;
		this.__listEdges = null;
		this.__listFaces = null;
	}
	
/*		public get entity():DDLSEntityAI
	{
		return this._entity;
	}

	public set this.entity(value:DDLSEntityAI):void
	{
		this._entity = value;
	}*/

	public get mesh():DDLSMesh
	{
		return this._mesh;
	}

	public set mesh(value:DDLSMesh)
	{
		this._mesh = value;
		this._astar.mesh = this._mesh;
	}
	
	public findPath(startX:number,startY:number,toX:number, toY:number, resultPath:any[],radius:number = 0):void
	{
		resultPath.splice(0, resultPath.length);
		
		if (!this._mesh)
			throw new Error("Mesh missing");
/*			if (!this._entity)
			throw new Error("Entity missing");*/
		
		if (DDLSGeom2D.isCircleIntersectingAnyConstraint(toX, toY, radius, this._mesh))
		{
			return;
		}
		
		this._astar.radius = radius;
		this._funnel.radius = radius;
		
		this.__listFaces.splice(0, this.__listFaces.length);
		this.__listEdges.splice(0, this.__listEdges.length);
		this._astar.findPath(startX, startY, toX, toY, this.__listFaces, this.__listEdges);
		if (this.__listFaces.length == 0)
		{
			//console.log("DDLSPathFinder this.__listFaces.length == 0");
			return;
		}
		this._funnel.findPath(startX, startY, toX, toY, this.__listFaces, this.__listEdges, resultPath);
	}

}